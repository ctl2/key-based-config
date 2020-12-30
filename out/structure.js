const objectCreator = document.getElementById("object-creator");
const objectDestroyer = document.getElementById("object-destroyer");

function getElement(html) {
    let wrapper = document.createElement("span");
    wrapper.innerHTML = html;
    return wrapper.children[0];
}

function handleEnter(event, accepted) {
    event.stopPropagation();
    if (accepted) {
        event.preventDefault(); // Allow dropping
        event.dataTransfer.dropEffect = "move"; // Style drag cursor
    }
}

class AdviceManager {

    static Advice = class {
        constructor(advice, endTriggerMessage, isOptional) {
            this.advice = advice;
            if (endTriggerMessage !== undefined) {
                this.endTriggerMessage = endTriggerMessage;
                this.isOptional = isOptional;
            }
        }
    }

    adviser;
    advice;
    progress;
    isActive;
    currentAdviceTimeout;
    fadeInDuration = 2000;
    readTimePerCharacter = 40;
    fadeOutDuration = 2000;
    helpButton;

    constructor(valueForest, metaTree, keyDepth)  {
        // Initialise advice field
        const hasValueForest = () => {
            let metaKeyTree = metaTree;
            while ("sub" in metaKeyTree) {
                if (Array.isArray(metaKeyTree.sub)) return true;
                metaKeyTree = metaKeyTree.sub;
            }
            return false;
        }

        const oneDeep = keyDepth === 1;
        this.adviser = ConfigKeyTree.rootNode.valueElement;
        this.advice = [
            new AdviceManager.Advice("Let's make some data!"),
            new AdviceManager.Advice("Drag the file picture onto me with your mouse",
                "create", false),
            new AdviceManager.Advice("Nice! You just made your first bit of data"),
            new AdviceManager.Advice("What you see below is the data's path"),
            new AdviceManager.Advice("When you add new data, it's given a default path"),
            new AdviceManager.Advice("To check out your data, ..."),
            new AdviceManager.Advice("... click on the " + (
                oneDeep?
                    "":
                    "rightmost"
                ) + " path node below",
                "key", true),
            new AdviceManager.Advice("Not that one, the farthest node to the right",
                "data", true),
            new AdviceManager.Advice("You should see an interface for editing data"),
            new AdviceManager.Advice("The top-most input is for the path node"),
                ...hasValueForest()? [
                    new AdviceManager.Advice("The others are for your data"),
                ]: [
                    new AdviceManager.Advice("The others are... oh, there aren't any others!"),
                    new AdviceManager.Advice("You must only need path data..."),
                    new AdviceManager.Advice("Well, that makes things a little simpler I suppose"),
                ],
            new AdviceManager.Advice("Before we start editing things, ..."),
            new AdviceManager.Advice("... try creating another bit of data",
                "reject", true),
            new AdviceManager.Advice("It didn't work. Don't worry, that was expected"),
            new AdviceManager.Advice("Each bit of data must have a unique path, ..."),
            new AdviceManager.Advice("... so you can't add anything new yet"),
            new AdviceManager.Advice("Okay, now try editing a path node's value",
                "edit", false),
            new AdviceManager.Advice("Close the editor by clicking the node again",
                "close", true),
            new AdviceManager.Advice("Now that we've got a non-default path node, ..."),
            new AdviceManager.Advice("... we can make another bit of data!"),
            new AdviceManager.Advice("Drag the file onto " + (
                oneDeep?
                    "me again":
                    "the edited node's parent"
                ),
                "create", false),
            new AdviceManager.Advice("You can drag path nodes around to move data",
                "drag", true),
                ...oneDeep? []: [
                    new AdviceManager.Advice("Nodes without siblings have a pin to their left"),
                    new AdviceManager.Advice("This prevents you from moving or deleting them"),
                    new AdviceManager.Advice("...Which brings us to deleting!"),
                ],
            new AdviceManager.Advice("A bin should appear when you start dragging nodes"),
            new AdviceManager.Advice("Delete data by dropping its path in the bin",
                "delete", true),
            new AdviceManager.Advice("And that's about all that you need to know!"),
            new AdviceManager.Advice("There's a trick for scrolling whilst dragging"),
            new AdviceManager.Advice("But I'll let you figure it out for yourself ;)"),
            new AdviceManager.Advice("Happy dragging!")
        ];
        // Initialise progress field
        const isDefaultBranch = (valueForest, metaTree, depth) => {
            if (valueForest.length !== 1) return false;
            const branch = valueForest[0]
            if (branch.value !== metaTree.default) return false;
            return depth === keyDepth?
                true:
                isDefaultBranch(branch.sub, metaTree.sub, depth + 1);
        }
        this.progress = valueForest.length === 0?
            0:
            isDefaultBranch(valueForest, metaTree, 0)?
                3:
                this.advice.length - 1;
        if (this.progress === this.advice.length - 1) {
            this.isActive = true;
            this.advise();
        } else {
            this.isActive = false;
            this.helpButton = getElement(
                `<svg style="transition-duration: ` + this.fadeOutDuration + `ms" x="0px" y="0px" viewBox="-10 -10 530 530" xml:space="preserve">
                    <circle cx="256" cy="378.5" r="25"/>
                    <path d="M256,0C114.516,0,0,114.497,0,256c0,141.484,114.497,256,256,256c141.484,0,256-114.497,256-256     C512,114.516,397.503,0,256,0z M256,472c-119.377,0-216-96.607-216-216c0-119.377,96.607-216,216-216     c119.377,0,216,96.607,216,216C472,375.377,375.393,472,256,472z"/>
                    <path d="M256,128.5c-44.112,0-80,35.888-80,80c0,11.046,8.954,20,20,20s20-8.954,20-20c0-22.056,17.944-40,40-40     c22.056,0,40,17.944,40,40c0,22.056-17.944,40-40,40c-11.046,0-20,8.954-20,20v50c0,11.046,8.954,20,20,20     c11.046,0,20-8.954,20-20v-32.531c34.466-8.903,60-40.26,60-77.469C336,164.388,300.112,128.5,256,128.5z"/>
                </svg>`
            );
            this.helpButton.onclick = () => {
                this.helpButton.onclick = null;
                // Start advising
                this.isActive = true;
                this.advise(false);
                this.removeHelpButton();
            }
            this.adviser.appendChild(this.helpButton);
        }
    }

    removeHelpButton() {
        this.helpButton.style.opacity = "0";
        window.setTimeout(
            () => this.helpButton.remove(),
            this.fadeOutDuration
        )
    }

    notify(message) {
        for (let i = this.progress; i < this.advice.length; i++) {
            const advice = this.advice[i];
            if ("endTriggerMessage" in advice) {
                if (message === advice.endTriggerMessage) {
                    this.progress = i + 1;
                    if (this.currentAdviceTimeout !== undefined) {
                        window.clearTimeout(this.currentAdviceTimeout);
                    }
                    // Make visual changes
                    this.advise(true);
                }
                if (!advice.isOptional) break;
            }
        }
    }

    advise(triggeredBySuccess) {
        if (!this.isActive) {
            if (!this.advice.slice(this.progress).some(advice => "endTriggerMessage" in advice && advice.isOptional === false)) {
                this.removeHelpButton();
            }
        } else {
            // handle success
            if (triggeredBySuccess) {
                const indicationLength = 2000;
                this.adviser.style.animationDuration = indicationLength + "ms";
                this.adviser.classList.add("success");
                window.setTimeout(() => {
                    this.adviser.classList.remove("success");
                }, indicationLength);
            }
            // Fade out
            this.adviser.style.opacity = "0";
            if (this.progress === this.advice.length) return; // Stop advising when all relevant advice has been displayed
            this.currentAdviceTimeout = window.setTimeout(() => {
                // Fade in
                const nextAdvice = this.advice[this.progress].advice;
                this.adviser.innerText = nextAdvice;
                this.adviser.style.opacity = "1";
                // Start next
                if ("endTriggerMessage" in this.advice[this.progress]) {
                    this.currentAdviceTimeout = undefined;
                } else {
                    // Recurse
                    this.currentAdviceTimeout = window.setTimeout(() => {
                        this.progress++;
                        this.advise(false);
                    }, this.fadeInDuration + nextAdvice.length * this.readTimePerCharacter);
                }
            }, this.fadeOutDuration);
        }
    }

}

const hoverHandler = {
    dragIsOngoing: false,
    activeHovers: [],
    push: function (hover) {
        if (hoverHandler.dragIsOngoing) return;
        if (hoverHandler.activeHovers.length > 0) hoverHandler.deactivate();
        hoverHandler.activeHovers.unshift(hover);
        hoverHandler.activate();
    },
    pop: function() {
        if (hoverHandler.dragIsOngoing) return;
        hoverHandler.deactivate();
        hoverHandler.activeHovers.shift();
        if (hoverHandler.activeHovers.length > 0) hoverHandler.activate();
    },
    removeAll: function() {
        if (hoverHandler.activeHovers.length === 0) return;
        hoverHandler.deactivate();
        hoverHandler.activeHovers = [];
    },
    activate: function() {
        hoverHandler.activeHovers[0].classList.add("hovered");
    },
    deactivate: function() {
        if (hoverHandler.activeHovers.length === 0) return;
        hoverHandler.activeHovers[0].classList.remove("hovered");
    },
    setDragIsOngoing: function(isOngoing, dragged) {
        if (!isOngoing) {
            hoverHandler.dragIsOngoing = false;
            hoverHandler.pop();
        } else {
            hoverHandler.removeAll();
            hoverHandler.push(dragged);
            hoverHandler.dragIsOngoing = true;
        }
    }
}

const clickHandler = {
    clickedNode: undefined,
    unloadFormInterface: undefined,

    acceptClick: function(configNode) {
        configNode.element.classList.add("selected");
        clickHandler.clickedNode = configNode;
        clickHandler.unloadFormInterface = loadFormInterface(configNode);
    },
    toggle: function(configNode) {
        if (clickHandler.clickedNode === undefined) {
            clickHandler.acceptClick(configNode);
        } else {
            clickHandler.clickedNode.element.classList.remove("selected");
            clickHandler.unloadFormInterface();
            if (clickHandler.clickedNode.isSameNode(configNode)) {
                clickHandler.clickedNode = undefined;
                ConfigKeyTree.adviceManager.notify("close");
            } else {
                clickHandler.acceptClick(configNode);
            }
        }
    },
    unclick: function(configNode) {
        if (clickHandler.clickedNode !== undefined) {
            if (configNode === undefined) {
                clickHandler.toggle(clickHandler.clickedNode);
            } else {
                if (configNode.isSameNode(clickHandler.clickedNode)) {
                    clickHandler.toggle(configNode);
                }
            }
        }
    }
}

class ConfigNode {

    value;
    label;
    type;
    validator;

    constructor(value, label, type, validator) {
        this.value = value
        this.label = label
        this.type = type
        this.validator = validator;
    }

    setValue(value) {
        this.value = value;
    }
}

class ConfigValueTree extends ConfigNode {

    parent;

    constructor(metaTree, valueTree, parent) {
        super(
            valueTree === undefined? metaTree.default: valueTree.value,
            metaTree.label,
            metaTree.type,
            metaTree.validator
        );
        this.parent = parent;
        // Assign sub
        if (!("sub" in metaTree)) return;
        this.sub = [];
        for (let i = 0; i < metaTree.sub.length; i++) {
            this.sub[i] = new ConfigValueTree(
                metaTree.sub[i],
                valueTree === undefined? undefined: valueTree.sub[i],
                this
            );
        }
    }

}

class ConfigKeyTree extends ConfigNode {

    static parentElement = document.getElementById("object-tree");
    static rootNode;
    static adviceManager;

    parent;
    sub;
    element;
    valueElement
    isDeepestKey;

    constructor(metaTree, valueTree, depth, parent) {
        super(
            valueTree === undefined? metaTree.default: valueTree.value,
            metaTree.label,
            metaTree.type,
            metaTree.validator
        );
        this.parent = parent;
        this.depth = depth;
        // Assign element
        this.element = document.createElement("div");
        this.element.classList.add("draggable-object");
        this.element.setAttribute("depth", depth);
        if (depth === 0) {
            this.valueElement = document.createElement("div");
            this.element.appendChild(this.valueElement);
            this.isDeepestKey = false;
            ConfigKeyTree.rootNode = this;
            // Assign sub
            this.sub = valueTree.sub.map(subTree => new ConfigKeyTree(metaTree, subTree, 1, this));
            if (this.sub.length === 0) this.valueElement.id = "adviser";
        } else {
            this.valueElement = document.createElement("span");
            this.element.appendChild(this.valueElement);
            this.isDeepestKey = Array.isArray(metaTree.sub);
            // Add hoverability
            this.element.classList.add("hoverable");
            this.element.onmouseenter = (event) => {
                if (this.element.isSameNode(event.target)) {
                    if (this.element.classList.contains("hoverable")) {
                        hoverHandler.push(this.element);
                    }
                }
            }
            this.element.onmouseleave = (event) => {
                if (this.element.isSameNode(event.target)) {
                    if (this.element.classList.contains("hoverable")) {
                        hoverHandler.pop();
                    }
                }
            }
            // Add clickability
            this.element.onclick = (event) => {
                if (this.element.isSameNode(event.target)) {
                    clickHandler.toggle(this);
                }
            }
            // Add drag functionality
            this.element.draggable = true;
            this.element.ondragend = (event) => {
                event.stopPropagation();
                // Style
                hoverHandler.setDragIsOngoing(false);
                // Reset paper-container
                objectCreator.style.removeProperty("display");
                objectDestroyer.style.display = "none";
                // Remove drag event listeners
                ConfigKeyTree.rootNode.stopListening();
            }
            this.element.ondragstart = (event) => {
                event.stopPropagation();
                // Style
                hoverHandler.setDragIsOngoing(true, this.element);
                // Handler definitions
                const parentalValidityArrays = ConfigKeyTree.rootNode.getParentalValidityArrays(this);
                // Declare element-relocation events
                const acceptDragEnter = (event, parent, sibling) => {
                    handleEnter(event, true);
                    this.removeSelf();
                    parent.addChild(this, sibling === undefined? 0: sibling.getChildIndex() + 1);
                    ConfigKeyTree.adviceManager.notify("drag");
                }
                for (let reject of parentalValidityArrays.invalid) {
                    reject.element.ondragenter = (event) => handleEnter(event, false);
                    reject.element.ondragover = (event) => handleEnter(event, false);
                }
                for (let parent of parentalValidityArrays.valid) {
                    parent.element.ondragenter = (event) => acceptDragEnter(event, parent);
                    parent.element.ondragover = (event) => handleEnter(event, true);
                    for (let sibling of parent.sub) {
                        if (sibling.value === this.value) {
                            sibling.element.ondragenter = (event) => handleEnter(event, false);
                            sibling.element.ondragover = (event) => handleEnter(event, false);
                        } else {
                            sibling.element.ondragenter = (event) => acceptDragEnter(event, parent, sibling);
                            sibling.element.ondragover = (event) => handleEnter(event, true);
                        }
                    }
                }
                // Change paper-container
                objectCreator.style.display = "none";
                objectDestroyer.style.removeProperty("display");
                objectDestroyer.ondrop = (event) => {
                    event.stopPropagation();
                    ConfigKeyTree.adviceManager.notify("delete");
                    this.element.ondragend(new DragEvent("end"));
                    this.element.ondragend = null; // Stop upcoming dragend event
                    this.parent.removeChild(this.value);
                    clickHandler.unclick(this);
                }
            };
            // Assign sub
            if ("sub" in metaTree) {
                if (this.isDeepestKey) {
                    this.sub = [];
                    for (let i = 0; i < metaTree.sub.length; i++) {
                        this.sub[i] = new ConfigValueTree(
                            metaTree.sub[i],
                            valueTree === undefined? undefined: valueTree.sub[i],
                            this
                        );
                    }
                } else {
                    if (valueTree === undefined) {
                        this.sub = [new ConfigKeyTree(
                            metaTree.sub,
                            undefined,
                            depth + 1,
                            this
                        )];
                    } else {
                        this.sub = [];
                        for (let i = 0; i < valueTree.sub.length; i++) {
                            this.sub[i] = new ConfigKeyTree(
                                metaTree.sub,
                                valueTree.sub[i],
                                depth + 1,
                                this
                            );
                        }
                    }
                }
            }
        }
        // Pin singleton subs
        if (this.sub.length === 1) this.sub[0].pin();
        // Add to DOM
        this.valueElement.classList.add("key-string");
        if (parent !== undefined) {
            parent.element.appendChild(this.element);
        } else if (depth === 0) {
            const separator = document.createElement("div");
            separator.classList.add("hr");
            this.element.appendChild(separator);
            ConfigKeyTree.parentElement.appendChild(this.element);
        }
        if (this.element.isConnected) {
            this.renderValue();
        } else {
            // Created by object creator
            // Set event listeners to show that the element can't be dragged onto
            // aka stop event propagation
            this.element.ondragenter = (event) => handleEnter(event, false);
            this.element.ondragover = (event) => handleEnter(event, false);
        }

    }

    stopListening() {
        this.element.ondragenter = null;
        this.element.ondragover = null;
        if (!this.isDeepestKey) {
            for (let tree of this.sub) {
                tree.stopListening();
            }
        }
    }

    getParentalValidityArrays(childNode) {
        const validParents = [];
        const invalidParents = [];
        // Assign self
        if (this.depth === childNode.depth - 1) {
            if (this.sub.some(
                tree => tree.value === childNode.value &&
                    !tree.isSameNode(childNode)
            )) {
                invalidParents.push(this);
            } else {
                validParents.push(this);
            }
        } else {
            invalidParents.push(this);
        }
        // Recurse
        if (!this.isDeepestKey) {
            for (let subTree of this.sub) {
                const subParentalValidityArrays = subTree.getParentalValidityArrays(childNode);
                validParents.push(...subParentalValidityArrays.valid);
                invalidParents.push(...subParentalValidityArrays.invalid);
            }
        }
        // Return
        return {
            valid: validParents,
            invalid: invalidParents
        }
    }

    pin() {
        this.element.draggable = false;
        // Make indicator
        if (this.depth < 2) return;
        this.element.insertBefore(getElement(
            `<svg class="svg-icon indicator" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xml:space="preserve" >
                <g transform="matrix(6.123233995736766e-17,-1,1,6.123233995736766e-17,0,512)">
                    <path
                        d="M256,0c-65.87,0-119.459,53.589-119.459,119.459c0,55.491,38.033,102.265,89.401,115.627v183.295    c0,0.786,0.092,1.567,0.275,2.332l19.997,83.598c1.073,4.49,5.076,7.664,9.692,7.689c0.018,0,0.035,0,0.054,0    c4.594,0,8.602-3.126,9.719-7.587l20.081-80.221c0.198-0.796,0.3-1.612,0.3-2.433V235.086    c51.367-13.362,89.401-60.135,89.401-115.627C375.459,53.589,321.87,0,256,0z M266.02,420.524l-9.84,39.312L245.98,417.2V238.495    c3.305,0.276,6.645,0.424,10.02,0.424s6.715-0.148,10.02-0.424V420.524z M256,218.88c-54.82,0-99.42-44.6-99.42-99.42    s44.6-99.42,99.42-99.42s99.42,44.6,99.42,99.42S310.82,218.88,256,218.88z" />
                    <path
                        d="M256,39.577c-44.047,0-79.882,35.835-79.882,79.882c0,5.534,4.487,10.02,10.02,10.02c5.533,0,10.02-4.486,10.02-10.02    c0-32.997,26.845-59.843,59.843-59.843c5.533,0,10.02-4.486,10.02-10.02S261.533,39.577,256,39.577z" />
                    <path
                        d="M186.238,136.767h-0.2c-5.533,0-10.02,4.486-10.02,10.02s4.487,10.02,10.02,10.02h0.2c5.533,0,10.02-4.486,10.02-10.02    S191.771,136.767,186.238,136.767z" />
                </g>
            </svg >`
        ), this.element.firstElementChild);
    }

    unpin() {
        if (this.element.childNodes.length < 2) return;
        let firstChild = this.element.firstElementChild;
        if (firstChild.matches("svg")) firstChild.remove();
        this.element.draggable = true;
    }

    addChild(child, index) {
        // Add to DOM
        if (index === this.sub.length) {
            this.element.appendChild(child.element);
        } else {
            this.element.insertBefore(child.element, this.sub[index].element);
        }
        // Add to sub
        this.sub.splice(index, 0, child);
        if (this.sub.length === 2) this.sub[index === 0? 1: 0].unpin();
        // Render value
        if (child.parent === undefined) child.renderBranchValues();
        child.parent = this;
    }

    removeSelf() {
        if (this.parent !== undefined) this.parent.removeChild(this.value);
    }

    removeChild(value) {
        let child;
        for (let i = 0; i < this.sub.length; i++) {
            child = this.sub[i];
            if (child.value === value) {
                child.parent = undefined;
                child.element.remove();
                this.sub.splice(i, 1);
                if (this.sub.length === 1) this.sub[0].pin();
                break;
            }
        }
    }

    getChildIndex() {
        for (let i = 0; i < this.parent.sub.length; i++) {
            if (this.parent.sub[i].value === this.value) return i;
        }
        throw new Error("Parent has no child with this value");
    }

    setValue(value) {
        super.setValue(value);
        this.renderValue();
    }

    renderValue() {
        let valueString = "" + this.value;
        const maxWidth = this.element.offsetWidth - 20;
        this.valueElement.innerText = valueString;
        if (this.depth > 0) {
            while (valueString.length > 1 && this.valueElement.offsetWidth >= maxWidth) {
                valueString = valueString.slice(0, valueString.length - 1);
                this.valueElement.innerText = valueString + " ...";
            }
        }
    }

    renderBranchValues() {
        this.renderValue();
        if (!this.isDeepestKey) {
            for (let tree of this.sub) {
                tree.renderBranchValues();
            }
        }
    }

    isSameNode(node) {
        return this.element.isSameNode(node.element);
    }

}

function loadDragInterface(title, keyDepth, metaTree, valueForest) {

    document.getElementById("title").innerText = title;

    // Get tree
    let configTree = new ConfigKeyTree(
        metaTree,
        {
            value: " ",
            sub: valueForest
        },
        0
    );

    // Initialise advice manager
    ConfigKeyTree.adviceManager = new AdviceManager(valueForest, metaTree, keyDepth);

    // Style
    document.getElementById("object-page").style.width = Math.max(
        keyDepth * 12,
        ...ConfigKeyTree.adviceManager.advice.map(
            adviceObject => adviceObject.advice.length * 0.8
        )
    ) + "em";

    // Add event listeners to svgs
    (function addStaticPaperFunctionality () {

        // Add object-destruction style
        const destroyedFile = objectDestroyer.querySelector("#recycled-file");
        let enterCount = 0;
        objectDestroyer.addEventListener("drop", function () {
            enterCount = 0;
            destroyedFile.classList.add("empty");
        });
        objectDestroyer.ondragenter = (event) => {
            handleEnter(event, true);
            enterCount++;
            destroyedFile.classList.remove("empty");
            // Drag leave
            objectDestroyer.ondragleave = () => {
                enterCount--;
                if (enterCount === 0) destroyedFile.classList.add("empty");
            }
        }
        objectDestroyer.ondragover = (event) => handleEnter(event, true);

        // Add object-creation functionality and style
        const getDefaultConfigTrees = (metaTree, depth) => {
            let tree = new ConfigKeyTree(
                metaTree,
                undefined,
                depth
            );
            let trees = Array.isArray(metaTree.sub)?
                []: getDefaultConfigTrees(metaTree.sub, depth + 1);
            trees.unshift(tree);
            return trees;
        }

        const getParentalValidityArrays = (configTrees) => {
            const validParents = [];
            const invalidParents = [];
            for (let tree of configTrees) {
                const parentalValidityArrays = configTree.getParentalValidityArrays(tree);
                validParents.push(...parentalValidityArrays.valid);
                invalidParents.push(...parentalValidityArrays.invalid);
            }
            return {
                valid: validParents,
                invalid: invalidParents
            }
        }

        objectCreator.parentElement.ondragstart = function (event) {
            event.stopPropagation();
            objectCreator.classList.add("empty");
            ConfigKeyTree.adviceManager.notify("reject");
            // Get defaults
            const defaultConfigTrees = getDefaultConfigTrees(metaTree, 1);
            const parentalValidityArrays = getParentalValidityArrays(defaultConfigTrees);
            let connectedDefaultTree;
            for (let reject of parentalValidityArrays.invalid) {
                reject.element.ondragenter = (event) => handleEnter(event, false);
                reject.element.ondragover = (event) => handleEnter(event, false);
            }
            for (let parent of parentalValidityArrays.valid) {
                parent.element.ondragover = (event) => handleEnter(event, true);
                parent.element.ondragenter = function (event) {
                    handleEnter(event, true);
                    ConfigKeyTree.adviceManager.notify("create");
                    // Remove old branch
                    if (connectedDefaultTree !== undefined) connectedDefaultTree.removeSelf();
                    // Connect new branch
                    connectedDefaultTree = defaultConfigTrees[parent.depth];
                    parent.addChild(connectedDefaultTree, 0);
                    // Special case for pinning a newly added child
                    // if it's the first branch to be added to the root
                    if (parent.depth === 0 && parent.sub.length === 1) connectedDefaultTree.pin();
                    // Remove old editor interface. Not necessary but seems like a good UX feature to me
                    clickHandler.unclick();
                }
            }
            objectCreator.parentElement.ondragend = () => {
                objectCreator.classList.remove("empty");
            }
        }

    }());

    // Add position trackers to DOM
    (function addDragPositionTrackers(trackerCount) {

        const scroller = ConfigKeyTree.parentElement.parentElement;

        const getTrackers = () => {
            const trackerHeight = 100 / trackerCount;
            const trackers = [];
            for (let i = 0; i < trackerCount; i++) {
                let tracker = document.createElement("section");
                const yVector = (trackerCount - 1) / 2 - i;
                // Set attributes
                tracker.setAttribute("top", "" + (trackerHeight * i));
                tracker.setAttribute("yVector", "" + yVector);
                // Draw tracker
                tracker.style.position = "absolute";
                tracker.style.height = trackerHeight + "%";
                tracker.style.width = "100%";
                tracker.style.top = tracker.getAttribute("top") + "%";
                // tracker.style.right = "0px";
                // Set drag behaviour
                const dragVector = (yVector * Math.pow(Math.abs(yVector), 2)) / (trackerCount * 2);
                tracker.ondragenter = function () {
                    let scroll = setInterval(() => {
                        scroller.scrollTop -= dragVector;
                    }, 5);
                    tracker.ondragleave = () => clearInterval(scroll);
                }
                // Add tracker to DOM
                trackers.push(tracker);
            }
            return trackers;
        }

        const parent = document.querySelector("#object-scroll-area");
        for (let tracker of getTrackers()) {
            parent.appendChild(tracker);
        }

    }(20));

}

function loadFormInterface(configKeyTree) {

    // Global variables
    const parentParent = document.getElementById("form-page-wrapper");
    const separator = parentParent.querySelector(".vr");
    const parentElement = document.getElementById("form-page");

    // Style
    parentParent.classList.add("active");
    separator.style.display = "none";

    // Global functions
    const isValid = (value, configNode) => {
        if (value === "") return false;
        if (configNode instanceof ConfigKeyTree) {
            for (let sibling of configNode.parent.sub) {
                if (sibling.value === value) {
                    return false;
                }
            }
        }
        return configNode.validator === undefined?
            true:
            configNode.validator(value);
    }

    const handleInput = (value, inputElement, configNode) => {
        if (isValid(value, configNode)) {
            configNode.setValue(value);
            if (configNode instanceof ConfigKeyTree) ConfigKeyTree.adviceManager.notify("edit");

        } else {
            inputElement.classList.add("invalid-input");
        }
    }

    const getInputRow = (configNode) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        labelCell.innerText = configNode.label;
        const inputCell = document.createElement("td");
        const inputElement = document.createElement("input");
        inputElement.classList.add("config-input");
        switch (configNode.type) {
            case "boolean":
                inputElement.type = "checkbox";
                inputElement.oninput = () => handleInput(inputElement.checked, inputElement, configNode);
                inputElement.checked = configNode.value;
                break;
            case "number":
                inputElement.type = "number";
                inputElement.oninput = () => handleInput(inputElement.value, inputElement, configNode);
                inputElement.value = configNode.value;
                break;
            case "string":
                inputElement.type = "text";
                inputElement.oninput = () => handleInput(inputElement.value, inputElement, configNode);
                inputElement.value = configNode.value;
        }
        row.appendChild(labelCell);
        row.appendChild(inputCell);
        inputCell.appendChild(inputElement);
        return row;
    }

    const loadForm = (inputRows) => {
        const table = document.createElement("table");
        for (let row of inputRows) {
            table.appendChild(row);
        }
        parentElement.appendChild(table);
    }

    const loadDataForm = () => {
        ConfigKeyTree.adviceManager.notify("data");
        const getInputRows = (configValueForest) => {
            const inputRows = [];
            for (let tree of configValueForest) {
                inputRows.push(getInputRow(tree));
                if ("sub" in tree) inputRows.push(...getInputRows(tree.sub));
            }
            return inputRows;
        }
        loadForm([getInputRow(configKeyTree), ...getInputRows(configKeyTree.sub)]);
    }

    const loadKeyForm = () => {
        ConfigKeyTree.adviceManager.notify("key");
        loadForm([getInputRow(configKeyTree)]);
    }

    // Reset form
    parentElement.innerHTML = "";

    // Load form
    if (configKeyTree.isDeepestKey) {
        loadDataForm();
    } else {
        loadKeyForm();
    }

    return function() {
        parentElement.innerHTML = "";
        parentParent.classList.remove("active");
        separator.style.removeProperty("display");
    }

}
