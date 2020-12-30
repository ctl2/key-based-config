import * as ValidationErrors from "./validationErrors.js";

function validateUnexpectedKeys(objectId: string, object: object, expected: string[]) {
    for (let key of Object.keys(object)) {
        if (!expected.some((expectedKey) => expectedKey === key))
            throw new ValidationErrors.UnexpectedAttributeError(objectId, key);
    }
}

function validateForest<T>(
    objectId: string,
    forest: any,
    treeValidator: (tree: any) => tree is T
): forest is T[] {
    if (!Array.isArray(forest))
        throw new ValidationErrors.UnexpectedTypeError(objectId, ["array"], typeof forest);
    for (let i = 0; i < forest.length; i++) {
        if (!treeValidator(forest[i])) throw new ValidationErrors.UnexpectedStateError();
    }
    return true;
}

function validateString(objectId: string, candidate: any): candidate is string {
    if (typeof candidate !== "string")
        throw new ValidationErrors.UnexpectedTypeError(objectId, ["string"], typeof candidate);
    if (candidate.length === 0) throw new Error("The empty string is not a valid " + objectId);
    return true;
}

const configTypes = ["boolean", "number", "string"] as const;
export type ConfigType = typeof configTypes[number];
function validateConfigType(candidate: any): candidate is ConfigType {
    if (typeof candidate !== "string")
        throw new ValidationErrors.UnexpectedTypeError(
            "ConfigType",
            [...configTypes],
            typeof candidate
        );
    if (!configTypes.some((type) => type === candidate))
        throw new Error("Invalid config type '" + candidate + "'.");
    return true;
}

export interface ConfigMetaTree {
    label: string;
    type: ConfigType;
    default: any;
    validator?: (input: any) => boolean;
    sub?: ConfigMetaTree | ConfigMetaTree[]; // Keys are singletons, values are arrays
}
function validateConfigMetaTree(candidate: any): candidate is ConfigMetaTree {
    function validateConfigMetaTree(candidate: any, isKey: boolean): candidate is ConfigMetaTree {
        if (typeof candidate !== "object")
            throw new ValidationErrors.UnexpectedTypeError("types", ["object"], typeof candidate);
        // Check for unexpected attributes
        validateUnexpectedKeys("meta", candidate, ["label", "type", "default", "validator", "sub"]);
        // Check required attributes
        // label
        if (!("label" in candidate))
            throw new ValidationErrors.MissingAttributeError("meta", "label");
        validateString("label", candidate.label);
        // type
        if (!("type" in candidate))
            throw new ValidationErrors.MissingAttributeError("meta", "type");
        if (!validateConfigType(candidate.type)) throw new ValidationErrors.UnexpectedStateError();
        // default
        if (!("default" in candidate))
            throw new ValidationErrors.MissingAttributeError("meta", "default");
        if (typeof candidate.default !== candidate.type)
            throw new ValidationErrors.UnexpectedTypeError(
                "default",
                [candidate.type],
                typeof candidate.default
            );
        if (candidate.type === "string") {
            validateString("default", candidate.default);
        }
        // Check optional attributes
        if ("validator" in candidate) {
            if (typeof candidate.validator !== "function")
                throw new ValidationErrors.UnexpectedTypeError(
                    "validator",
                    ["function"],
                    typeof candidate.validator
                );
            if (candidate.validator(candidate.default) !== true)
                throw new Error(
                    "If a validator is given, defaults must be accepted; Default '" +
                        candidate.default +
                        "' was rejected."
                );
        }
        if ("sub" in candidate) {
            if (Array.isArray(candidate.sub)) {
                if (
                    !validateForest<ConfigMetaTree>(
                        "sub",
                        candidate.sub,
                        (candidate): candidate is ConfigMetaTree =>
                            validateConfigMetaTree(candidate, false)
                    )
                )
                    throw new ValidationErrors.UnexpectedStateError();
            } else {
                // Check non-keys don't have singleton subs
                if (!isKey)
                    throw new ValidationErrors.UnexpectedTypeError(
                        "sub",
                        ["array"],
                        typeof candidate.sub
                    );
                if (!validateConfigMetaTree(candidate.sub, true))
                    throw new ValidationErrors.UnexpectedStateError();
            }
        }
        return true;
    }
    return validateConfigMetaTree(candidate, true);
}

export interface ConfigValueTree {
    value: any;
    sub?: ConfigValueTree[];
}
function validateConfigValueTree(candidate: any): candidate is ConfigValueTree {
    if (typeof candidate !== "object")
        throw new ValidationErrors.UnexpectedTypeError("valueTree", ["object"], typeof candidate);
    // Check for unexpected attributes
    validateUnexpectedKeys("meta", candidate, ["value", "sub"]);
    // Check required attributes
    if (!("value" in candidate))
        throw new ValidationErrors.MissingAttributeError("valueTree", "value");
    if (!validateConfigType(typeof candidate.value))
        throw new ValidationErrors.UnexpectedStateError();
    if (typeof candidate.value === "string") {
        validateString("value", candidate.value);
    }
    // Check optional attributes
    if ("sub" in candidate) {
        if (!Array.isArray(candidate.sub))
            throw new ValidationErrors.UnexpectedTypeError(
                "valueForest",
                ["array"],
                typeof candidate.sub
            );
        if (!validateForest("sub", candidate.sub, validateConfigValueTree))
            throw new ValidationErrors.UnexpectedStateError();
    }
    return true;
}

function getKeyDepth(metaTree: ConfigMetaTree): number {
    function getKeyDepth(metaTree: ConfigMetaTree, currentDepth: number): number {
        if (!("sub" in metaTree)) return currentDepth;
        if (Array.isArray(metaTree.sub)) return currentDepth;
        return getKeyDepth(metaTree.sub, currentDepth + 1);
    }
    return getKeyDepth(metaTree, 1);
}

function validateCompliance(metaTree: ConfigMetaTree, valueForest: ConfigValueTree[]) {
    const validateCompliance = (metaTree: ConfigMetaTree, valueTree: ConfigValueTree) => {
        if (typeof valueTree.value !== metaTree.type)
            throw new ValidationErrors.UnexpectedTypeError(
                "value",
                [metaTree.type],
                typeof valueTree.value
            );
        if ("validator" in metaTree) {
            if (!metaTree.validator(valueTree.value))
                throw new Error(
                    "If a validator is given, current values must be accepted; Value '" +
                        valueTree.value +
                        "' was rejected."
                );
        }
        if ("sub" in metaTree !== "sub" in valueTree)
            throw new Error("meta structure must match value structure");
    };

    const validateKeyLevelCompliance = (
        metaTree: ConfigMetaTree,
        valueForest: ConfigValueTree[]
    ) => {
        // Check non-empty
        if (valueForest.length === 0) throw new Error("valueForest length cannot be zero.");
        // Check for duplicate keys
        for (let i = 0; i < valueForest.length; i++) {
            let testeeKey = valueForest[i].value;
            for (let j = i + 1; j < valueForest.length; j++) {
                if (testeeKey === valueForest[j].value)
                    throw new Error(
                        "Key paths must be unique; Duplicate path ending with '" +
                            testeeKey +
                            "' was found."
                    );
            }
        }
        // Validate sub
        if ("sub" in metaTree) {
            if (Array.isArray(metaTree.sub)) {
                for (let valueTree of valueForest) {
                    validateCompliance(metaTree, valueTree);
                    validateValueLevelCompliance(metaTree.sub, valueTree.sub);
                }
            } else {
                for (let valueTree of valueForest) {
                    validateCompliance(metaTree, valueTree);
                    validateKeyLevelCompliance(metaTree.sub, valueTree.sub);
                }
            }
        } else {
            for (let valueTree of valueForest) {
                validateCompliance(metaTree, valueTree);
            }
        }
    };

    const validateValueLevelCompliance = (
        metaForest: ConfigMetaTree[],
        valueForest: ConfigValueTree[]
    ) => {
        if (metaForest.length === 0) throw new Error("metaForest length cannot be zero.");
        if (valueForest.length === 0) throw new Error("valueForest length cannot be zero.");

        if (metaForest.length !== valueForest.length)
            throw new Error(
                "valueForest length must match metaForest length when outside of key depth"
            );
        let metaTree: ConfigMetaTree;
        let valueTree: ConfigValueTree;
        for (let i = 0; i < metaForest.length; i++) {
            metaTree = metaForest[i];
            valueTree = valueForest[i];
            validateCompliance(metaTree, valueForest[i]);
            if ("sub" in metaTree) {
                validateValueLevelCompliance(metaTree.sub as ConfigMetaTree[], valueTree.sub);
            }
        }
    };

    if (valueForest.length === 0) return; // Empty value tree is fine, no further checking required
    validateKeyLevelCompliance(metaTree, valueForest);
}

export default function extractConfig(data: any): [string, number, ConfigMetaTree, ConfigValueTree[]] {
    // Extract data
    if (typeof data !== "object") throw new Error("data must be an object");
    let title: any = data.title;
    let metaTree: any = data.metaTree;
    let valueForest: any = data.valueForest;
    // Check individual validity
    if (!validateString("title", title)) throw new ValidationErrors.UnexpectedStateError();
    if (!validateConfigMetaTree(metaTree)) throw new ValidationErrors.UnexpectedStateError();
    if (!validateForest("valueForest", valueForest, validateConfigValueTree))
        throw new ValidationErrors.UnexpectedStateError();
    // Check group validity
    validateCompliance(metaTree, valueForest);
    // Return valid config
    return [title, getKeyDepth(metaTree), metaTree, valueForest];
}
