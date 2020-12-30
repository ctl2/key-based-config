// Private methods
const getOptionString = (array: string[]) =>
    array.reduce((options, option, index) =>
        index === array.length - 1 ? options + " or " + option : options + ", " + option
    );

// Exports
export class UnexpectedStateError extends Error {
    constructor() {
        super("unexpected state reached.");
    }
}

export class UnexpectedTypeError extends Error {
    constructor(target: string, expected: string[], found: string) {
        super(
            target +
                " may only be assigned " +
                (expected.length === 1 ? expected[0] : getOptionString(expected)) +
                " type values; " +
                found +
                " type found."
        );
    }
}

export class MissingAttributeError extends Error {
    constructor(target: string, attribute: string) {
        super("attribute '" + attribute + "' is missing from " + target + ".");
    }
}

export class UnexpectedAttributeError extends Error {
    constructor(target: string, attribute: string) {
        super("unexpected attribute '" + attribute + "' found in " + target + ".");
    }
}
