// vendor/khronos-interactivity/BasicBehaveEngine/JsonPtrTrie.ts
var TrieNode = class {
  constructor(type) {
    this.children = /* @__PURE__ */ new Map();
    this.isEndOfPath = false;
    this.trieNodeType = type;
    this.readOnly = false;
  }
};
var JsonPtrTrie = class {
  constructor() {
    this.root = new TrieNode(0 /* ROOT */);
  }
  /**
   * Adds a path to the JSON Pointer Trie along with getter and setter callbacks.
   * @param path - The JSON Pointer path to add.
   * @param getterCallback - A callback function to get the value at the specified path.
   * @param setterCallback - A callback function to set the value at the specified path.
   */
  addPath(path, getterCallback, setterCallback, typeName, readOnly) {
    const pathPieces = path.split("/");
    let currentNode = this.root;
    for (let i = 0; i < pathPieces.length; i++) {
      const pathPiece = pathPieces[i];
      if (!currentNode.children.has(pathPiece)) {
        const type = isNaN(Number(pathPiece)) ? 1 /* STRING */ : 2 /* INDEX */;
        let nodeToSet;
        if (type === 2 /* INDEX */) {
          const indexNodeKey = Array.from(currentNode.children.keys()).find((key) => currentNode.children.get(key).trieNodeType === 2 /* INDEX */);
          if (indexNodeKey === void 0) {
            nodeToSet = new TrieNode(2 /* INDEX */);
          } else {
            nodeToSet = currentNode.children.get(indexNodeKey);
            currentNode.children.delete(indexNodeKey);
          }
        } else if (type === 1 /* STRING */) {
          nodeToSet = new TrieNode(type);
        } else {
          throw Error("Invalid Node Type");
        }
        currentNode.children.set(pathPiece, nodeToSet);
      }
      currentNode = currentNode.children.get(pathPiece);
    }
    currentNode.isEndOfPath = true;
    currentNode.getterCallback = getterCallback;
    currentNode.setterCallback = setterCallback;
    currentNode.typeName = typeName;
    currentNode.readOnly = readOnly;
  }
  removePath(path) {
    const pathPieces = path.split("/");
    let currentNode = this.root;
    for (let i = 0; i < pathPieces.length - 1; i++) {
      const pathPiece = pathPieces[i];
      const child = currentNode.children.get(pathPiece);
      if (!child) {
        return;
      }
      currentNode = child;
    }
    currentNode.children.delete(pathPieces[pathPieces.length - 1]);
  }
  /**
   * Checks if a given JSON Pointer path is valid within the Trie.
   * @param path - The JSON Pointer path to validate.
   * @returns `true` if the path is valid, `false` otherwise.
   */
  isPathValid(path) {
    const leafNode = this.traversePath(path);
    return leafNode === void 0 ? false : leafNode.isEndOfPath;
  }
  isReadOnly(path) {
    const node = this.traversePath(path);
    return node === void 0 ? false : node.readOnly;
  }
  /**
   * Retrieves the value at a specified JSON Pointer path.
   * @param path - The JSON Pointer path to retrieve the value from.
   * @returns The value at the specified path.
   */
  getPathValue(path) {
    const node = this.traversePath(path);
    if (node !== void 0 && node.getterCallback !== void 0) {
      return node.getterCallback(path);
    }
  }
  getPathTypeName(path) {
    const node = this.traversePath(path);
    if (node !== void 0 && node.typeName !== void 0) {
      return node.typeName;
    }
  }
  /**
   * Sets the value at a specified JSON Pointer path.
   * @param path - The JSON Pointer path to set the value for.
   * @param value - The value to set at the specified path.
   */
  setPathValue(path, value) {
    const node = this.traversePath(path);
    if (node !== void 0 && node.setterCallback !== void 0) {
      return node.setterCallback(path, value);
    }
  }
  /**
   * Returns all registered paths exactly as they were added to the trie.
   */
  getRegisteredPaths() {
    const paths = [];
    const walk = (node, segments) => {
      if (node.isEndOfPath) {
        paths.push(segments.join("/"));
      }
      for (const [segment, child] of node.children.entries()) {
        walk(child, [...segments, segment]);
      }
    };
    walk(this.root, []);
    return paths.sort();
  }
  traversePath(path) {
    const pathPieces = path.split("/");
    let currentNode = this.root;
    for (let i = 0; i < pathPieces.length; i++) {
      const pathPiece = pathPieces[i];
      if (!currentNode.children.has(pathPiece)) {
        if (isNaN(Number(pathPiece))) {
          return void 0;
        }
        const numericalKey = [...currentNode.children.keys()].find((key) => currentNode.children.get(key).trieNodeType === 2 /* INDEX */);
        if (numericalKey === void 0) {
          return void 0;
        }
        if (Number(pathPiece) >= Number(numericalKey) || Number(pathPiece) < 0) {
          return void 0;
        }
        currentNode = currentNode.children.get(numericalKey);
      } else {
        currentNode = currentNode.children.get(pathPiece);
      }
    }
    return currentNode;
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/experimental/noOpRegistry.ts
var noOpNodes = /* @__PURE__ */ new WeakSet();
function registerNoOpNode(node) {
  noOpNodes.add(node);
}
function isNoOpNode(node) {
  return noOpNodes.has(node);
}

// vendor/khronos-interactivity/BasicBehaveEngine/BehaveEngineNode.ts
var BehaveEngineNode = class {
  constructor(props) {
    this.REQUIRED_VALUES = {};
    this.REQUIRED_CONFIGURATIONS = {};
    // Resolve a "#/..."-style JSON pointer ref down to its trailing id.
    this.resolveRef = (ref) => {
      if (ref == null || ref === "") {
        return -1;
      }
      const parts = String(ref).split("/").filter(Boolean);
      return parts.length === 0 ? -1 : Number(parts[parts.length - 1]);
    };
    const { index, flows, values, idToBehaviourNodeMap, graphEngine, variables, events, types, configuration, addEventToWorkQueue, declaration } = props;
    this.index = index;
    this.idToBehaviourNodeMap = idToBehaviourNodeMap;
    this.graphEngine = graphEngine;
    this.variables = variables;
    this.types = types;
    this.events = events;
    this.values = values;
    this.flows = flows;
    this.configuration = configuration;
    this.outValues = {};
    this.addEventToWorkQueue = addEventToWorkQueue;
    this.declaration = declaration;
  }
  /**
   * Initializes and returns a new BehaveEngineNode instance.
   * @param props - The properties and settings for the BehaveEngineNode.
   * @returns A new BehaveEngineNode instance.
   */
  static init(props) {
    return new this(props);
  }
  /**
   * Processes the node and its associated flow.
   * @param flowSocket - The socket associated with the flow (optional).
   */
  processNode(flowSocket) {
    if (this.flows !== void 0 && this.flows.out !== void 0) {
      this.processFlow(this.flows.out);
    }
  }
  /**
   * Processes a specific flow associated with this node.
   * @param flow - The flow object to be processed.
   */
  processFlow(flow) {
    if (flow === void 0 || flow.node === void 0) {
      return;
    }
    const nextNode = this.idToBehaviourNodeMap.get(Number(flow.node));
    if (nextNode === void 0) {
      return;
    }
    this.graphEngine.processExecutingNextNode(flow);
    nextNode.processNode(flow.socket);
  }
  /**
   * Validates the presence of required values.
   * @param values - An object containing values to be validated.
   * @throws An error if a required value is missing.
   */
  validateValues(values) {
    Object.keys(this.REQUIRED_VALUES).forEach((requiredValue) => {
      if (values == null || values[requiredValue] == null) {
        const err = `Required Value ${requiredValue} is missing for ${this.name}`;
        console.error(err);
        throw new Error(err);
      }
    });
  }
  /**
   * Validates the presence of required configurations.
   * @param configurations - An object containing configurations to be validated.
   * @throws An error if a required configuration is missing.
   */
  validateConfigurations(configurations) {
    let isMissingConfigs = false;
    Object.entries(this.REQUIRED_CONFIGURATIONS).forEach(([key, value]) => {
      if (configurations[key] == null) {
        if (value.defaultValue == null) {
          const err = `Required Configuration ${key} is missing and there is no default value provided for ${this.name}`;
          console.error(err);
          throw new Error(err);
        } else {
          configurations[key] = { value: value.defaultValue };
          isMissingConfigs = true;
        }
      }
    });
    if (isMissingConfigs) {
      Object.entries(this.REQUIRED_CONFIGURATIONS).forEach(([key, value]) => {
        configurations[key] = { value: value.defaultValue };
      });
    }
  }
  /**
   * Evaluates all values based on their definitions.
   * @param vals - An array of value names to be evaluated.
   * @returns An object containing the evaluated values.
   */
  evaluateAllValues(vals) {
    const res = {};
    for (let i = 0; i < vals.length; i++) {
      const val = this.evaluateValue(vals[i], this.values[vals[i]]);
      if (Array.isArray(val) && val.length === 1) {
        console.error("This should not happen \u2013 an array with a single value was returned");
      }
      res[vals[i]] = val;
    }
    return res;
  }
  evaluateValue(key, val) {
    if (val === void 0) {
      throw new Error(`Value ${key} is missing for ${this.name}`);
    }
    if (val.value != null) {
      const typeName = this.getType(val.type);
      return this.parseType(typeName, val.value);
    } else if (val.node != null) {
      const cachedValue = this.graphEngine.getValueEvaluationCacheValue(`${val.node}-${val.socket}`);
      if (cachedValue !== void 0) {
        this.values[key] = { ...this.values[key], type: cachedValue.type };
        const typeName2 = this.getType(cachedValue.type);
        return this.parseType(typeName2, cachedValue.value);
      }
      const dependentNode = this.idToBehaviourNodeMap.get(Number(val.node));
      let valueToReturn;
      let typeIndex;
      if (dependentNode.outValues !== void 0 && dependentNode.outValues[val.socket] !== void 0) {
        valueToReturn = dependentNode.outValues[val.socket].value;
        typeIndex = dependentNode.outValues[val.socket].type;
        this.values[key] = { ...this.values[key], type: typeIndex };
      } else {
        const dependentNodeValues = dependentNode.processNode();
        if (dependentNodeValues === void 0 || dependentNodeValues[val.socket] === void 0) {
          if (isNoOpNode(dependentNode)) {
            throw new Error(`"${this.name}" depends on output socket "${val.socket}" of "${dependentNode.name}", which does not execute or produce output because this tool does not implement its operation.`);
          }
          throw new Error(`Output socket ${val.socket} is missing on ${dependentNode.name}`);
        }
        const dependentValue = dependentNodeValues[val.socket];
        typeIndex = dependentValue.type;
        valueToReturn = dependentValue.value;
        this.values[key] = { ...this.values[key], type: dependentValue.type };
      }
      this.graphEngine.addEntryToValueEvaluationCache(`${val.node}-${val.socket}`, { socket: val.socket, value: valueToReturn, type: typeIndex });
      const typeName = this.getType(typeIndex);
      return this.parseType(typeName, valueToReturn);
    }
  }
  /**
   * Evaluates all configurations based on their definitions.
   * @param configs - An array of configuration names to be evaluated.
   * @returns An object containing the evaluated configuration values.
   */
  evaluateAllConfigurations(configs) {
    const res = {};
    for (let i = 0; i < configs.length; i++) {
      res[configs[i]] = this.evaluateConfiguration(this.configuration[configs[i]]);
    }
    return res;
  }
  getType(id) {
    const type = this.types[id];
    if (type === void 0) {
      console.log(id);
      console.log(this.types);
    }
    let typeName;
    if (type?.signature === "custom" && type?.extensions) {
      typeName = Object.keys(type.extensions)[0];
    } else {
      typeName = type.signature;
    }
    return typeName;
  }
  getTypeIndex(name) {
    const typeNames = this.types.map((type, index) => this.getType(index));
    return typeNames.indexOf(name);
  }
  getDefaultValueForType(type) {
    switch (type) {
      case "ref":
        return [null];
      case "bool":
        return [false];
      case "int":
        return [0];
      case "float":
        return [NaN];
      case "float2":
        return [NaN, NaN];
      case "float3":
        return [NaN, NaN, NaN];
      case "float4":
      case "float2x2":
        return [NaN, NaN, NaN, NaN];
      case "float3x3":
        return [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
      case "float4x4":
        return [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
      default:
        console.error(`No default value for type ${type} returning NaN which is probably not valid`);
        return [NaN];
    }
  }
  parseType(type, val) {
    const scalarValue = Array.isArray(val) ? val[0] : val;
    switch (type) {
      case "bool":
        return scalarValue === "true" || scalarValue === true;
      case "int":
        return Number(scalarValue);
      case "float":
        return Number(scalarValue);
      case "float2":
        return val;
      case "float3":
        return val;
      case "float4":
        return val;
      case "float4x4":
        return val;
      case "ref":
        return scalarValue;
      default:
        return val;
    }
  }
  evaluateConfiguration(configuration) {
    return configuration.value;
  }
  populatePath(path, refs, indices) {
    for (const ref of Object.keys(refs)) {
      const refValue = refs[ref];
      const index = this.resolveRef(refValue);
      if (index !== -1) {
        path = path.replace(`{${ref}}`, index.toString());
      } else {
        throw new Error(`Invalid reference value for ${ref}: ${refValue}`);
      }
    }
    for (const index of Object.keys(indices)) {
      path = path.replace(`[${index}]`, indices[index]);
    }
    return path;
  }
  isReadOnlyPointer(pointer, refs, indices) {
    const readOnlyTestRefs = {};
    for (const ref of refs) {
      readOnlyTestRefs[ref] = "0";
    }
    const readOnlyTestIndices = {};
    for (const index of indices) {
      readOnlyTestIndices[index] = "0";
    }
    const readOnlyTestPath = this.populatePath(pointer, readOnlyTestRefs, readOnlyTestIndices);
    return this.graphEngine.isReadOnly(readOnlyTestPath);
  }
  parsePathRefVariables(path) {
    return this.parsePathVariables(path, "{", "}");
  }
  parsePathIndexVariables(path) {
    return this.parsePathVariables(path, "[", "]");
  }
  parsePathVariables(path, openDel, closeDel) {
    const regex = new RegExp(`\\${openDel}([^\\${closeDel}]+)\\${closeDel}`, "g");
    const match = path.match(regex);
    const keys = [];
    if (!match) {
      return keys;
    }
    for (const m of match) {
      const key = m.slice(openDel.length, -closeDel.length);
      keys.push(key);
    }
    return keys;
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/OnStart.ts
var OnStartNode = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "OnStart";
    this.outValues.event = { value: [`/extensions/KHR_interactivity/events/${this.events.length}`], type: this.getTypeIndex("ref") };
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return super.processNode(flowSocket);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/OnTick.ts
var OnTickNode = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this._startTime = NaN;
    this._lastTickTime = NaN;
    this._floatTypeIndex = -1;
    this._refTypeIndex = -1;
    this.name = "OnTick";
    this._floatTypeIndex = this.getTypeIndex("float");
    this._refTypeIndex = this.getTypeIndex("ref");
    this.outValues.event = { value: [`/extensions/KHR_interactivity/events/${this.events.length + 1}`], type: this._refTypeIndex };
    this.outValues.timeSinceStart = { value: [NaN], type: this._floatTypeIndex };
    this.outValues.timeSinceLastTick = { value: [NaN], type: this._floatTypeIndex };
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    const tickTime = this.graphEngine.lastTickTime / 1e3;
    if (isNaN(this._startTime)) {
      this.outValues.timeSinceStart = { value: [0], type: this._floatTypeIndex };
      this.outValues.timeSinceLastTick = { value: [NaN], type: this._floatTypeIndex };
      this._startTime = tickTime;
    } else {
      this.outValues.timeSinceStart = { value: [tickTime - this._startTime], type: this._floatTypeIndex };
      this.outValues.timeSinceLastTick = { value: [tickTime - this._lastTickTime], type: this._floatTypeIndex };
    }
    this._lastTickTime = tickTime;
    return super.processNode(flowSocket);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/Branch.ts
var Branch = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { condition: {} };
    this.name = "Branch";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { condition } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    if (JSON.parse(condition)) {
      if (this.flows.true != null) {
        this.processFlow(this.flows.true);
      }
    } else {
      if (this.flows.false != null) {
        this.processFlow(this.flows.false);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/DoN.ts
var DoN = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { n: {} };
    this.name = "DoN";
    this.validateValues(this.values);
    this._currentCount = 0;
    this.outValues.currentCount = { value: [this._currentCount], type: this.getTypeIndex("int") };
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { n } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    if (flowSocket === "reset") {
      this._currentCount = 0;
      this.outValues.currentCount = { value: [this._currentCount], type: this.getTypeIndex("int") };
      return;
    }
    if (this._currentCount >= Number(n)) {
      return;
    }
    this._currentCount++;
    this.outValues.currentCount = { value: [this._currentCount], type: this.getTypeIndex("int") };
    super.processNode(flowSocket);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/ForLoop.ts
var ForLoop = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { initialIndex: { defaultValue: [0] } };
    this.REQUIRED_VALUES = { startIndex: {}, endIndex: {} };
    this.name = "ForLoop";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { initialIndex } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._initialIndex = initialIndex[0];
    this.outValues.index = { value: [this._initialIndex], type: this.getTypeIndex("int") };
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    let { startIndex, endIndex } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    this.outValues.index = { value: [0], type: this.getTypeIndex("int") };
    for (let i = Number(startIndex); i < Number(endIndex); i++) {
      this.outValues.index = { value: [i], type: this.getTypeIndex("int") };
      if (this.flows.loopBody != null) {
        this.processFlow(this.flows.loopBody);
      }
      this.graphEngine.clearValueEvaluationCache();
      const reEvaluatedValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
      startIndex = reEvaluatedValues.startIndex;
      endIndex = reEvaluatedValues.endIndex;
    }
    this.outValues.index = { value: [endIndex], type: this.getTypeIndex("int") };
    if (this.flows.completed != null) {
      this.processFlow(this.flows.completed);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/MultiGate.ts
var MultiGate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { isRandom: { defaultValue: [false] }, isLoop: { defaultValue: [false] } };
    this.name = "MultiGate";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { isRandom, isLoop } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._numberOutputFlows = Object.keys(this.flows).length;
    this._isRandom = isRandom[0];
    this._isLoop = isLoop[0];
    this._orderedOutFlows = Object.keys(this.flows).sort();
    this._unSeenOutIndexes = Array(this._numberOutputFlows).fill(0).map((_, index) => index);
    this._currentIndex = this._isRandom ? Math.floor(Math.random() * this._unSeenOutIndexes.length) : 0;
    this.outValues.lastIndex = { value: [-1], type: this.getTypeIndex("int") };
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    this.graphEngine.processNodeStarted(this);
    if (flowSocket === "reset") {
      this._currentIndex = this._isRandom ? Math.floor(Math.random() * this._unSeenOutIndexes.length) : 0;
      this._unSeenOutIndexes = Array(this._numberOutputFlows).fill(0).map((_, index) => index);
      return;
    }
    if (this._unSeenOutIndexes.length === 0) {
      return;
    }
    const currentFlowName = this._orderedOutFlows[this._unSeenOutIndexes[this._currentIndex]];
    this.outValues.lastIndex = { value: [this._unSeenOutIndexes[this._currentIndex]], type: this.getTypeIndex("int") };
    this.processFlow(this.flows[currentFlowName]);
    this._unSeenOutIndexes.splice(this._currentIndex, 1);
    if (this._unSeenOutIndexes.length === 0) {
      if (this._isLoop) {
        this._unSeenOutIndexes = Array(this._numberOutputFlows).fill(0).map((_, index) => index);
      } else {
        return;
      }
    }
    if (this._isRandom) {
      this._currentIndex = Math.floor(Math.random() * this._unSeenOutIndexes.length);
    } else {
      this._currentIndex = this._currentIndex % this._unSeenOutIndexes.length;
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/Sequence.ts
var Sequence = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "Sequence";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    this._numberOutputFlows = Object.keys(this.flows).length;
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    this.graphEngine.processNodeStarted(this);
    const flows = Object.keys(this.flows).sort();
    for (let i = 0; i < flows.length; i++) {
      const flow = this.flows[flows[i]];
      if (!flow) continue;
      this.processFlow(flow);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/Switch.ts
var Switch = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { cases: { defaultValue: [[]] } };
    this.REQUIRED_VALUES = { selection: {} };
    this.name = "Switch";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { cases } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._cases = cases;
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    this.graphEngine.clearValueEvaluationCache();
    const { selection } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    const selected = this.flows[selection];
    if (selected === void 0) {
      if (this.flows.default != null) {
        this.processFlow(this.flows.default);
      }
    } else {
      this.processFlow(this.flows[selection]);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/Throttle.ts
var Throttle = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { duration: {} };
    this.name = "Throttle";
    this.validateValues(this.values);
    this._lastRemainingTime = NaN;
    this.outValues.lastRemainingTime = { value: [NaN], type: this.getTypeIndex("float") };
    this._lastSuccessfulCall = 0;
  }
  processNode(flowSocket) {
    if (flowSocket === "reset") {
      this._lastRemainingTime = NaN;
      this.outValues.lastRemainingTime = { value: [NaN], type: this.getTypeIndex("float") };
      return;
    }
    this.graphEngine.clearValueEvaluationCache();
    const { duration } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    if (isNaN(duration) || !isFinite(duration) || duration < 0) {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    } else {
      const now = this.graphEngine.lastTickTime;
      if (!isNaN(this._lastRemainingTime)) {
        const timeSinceLastCall = now - this._lastSuccessfulCall;
        if (timeSinceLastCall <= duration * 1e3) {
          this._lastRemainingTime = duration - timeSinceLastCall / 1e3;
          this.outValues.lastRemainingTime = { value: [duration - timeSinceLastCall / 1e3], type: this.getTypeIndex("float") };
          return;
        }
      }
      this._lastRemainingTime = 0;
      this.outValues.lastRemainingTime = { value: [0], type: this.getTypeIndex("float") };
      this._lastSuccessfulCall = now;
      super.processNode(flowSocket);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/WaitAll.ts
var WaitAll = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { inputFlows: { defaultValue: [0] } };
    this.name = "WaitAll";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { inputFlows } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._numberInputFlows = Number(inputFlows);
    this._lockedFlows = [...Array(this._numberInputFlows).keys()];
    this.outValues.remainingInputs = { value: [this._lockedFlows.length], type: this.getTypeIndex("int") };
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    this.graphEngine.processNodeStarted(this);
    if (flowSocket === "reset") {
      this._lockedFlows = [...Array(this._numberInputFlows).keys()];
      this.outValues.remainingInputs = { value: [this._lockedFlows.length], type: this.getTypeIndex("int") };
      return;
    }
    const flowIndexToRemove = this._lockedFlows.findIndex((flow) => flow === Number(flowSocket));
    if (flowIndexToRemove !== -1) {
      this._lockedFlows.splice(flowIndexToRemove, 1);
    }
    this.outValues.remainingInputs = { value: [this._lockedFlows.length], type: this.getTypeIndex("int") };
    if (this._lockedFlows.length === 0) {
      if (this.flows.completed != null) {
        this.processFlow(this.flows.completed);
      }
    } else {
      if (this.flows.out != null) {
        this.processFlow(this.flows.out);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/WhileLoop.ts
var WhileLoop = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { condition: {} };
    this.name = "WhileLoop";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    this.graphEngine.clearValueEvaluationCache();
    let condition = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES)).condition;
    while (condition) {
      if (this.flows.loopBody != null) {
        this.processFlow(this.flows.loopBody);
      }
      this.graphEngine.clearValueEvaluationCache();
      condition = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES)).condition;
    }
    if (this.flows.completed != null) {
      this.processFlow(this.flows.completed);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/pointer/PointerGet.ts
var PointerGet = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { pointer: {}, type: {} };
    this.name = "PointerGet";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { pointer, type } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._pointer = pointer[0];
    this._typeIndex = type[0];
    this._refs = this.parsePathRefVariables(this._pointer);
    this._indices = this.parsePathIndexVariables(this._pointer);
  }
  processNode(flowSocket) {
    const configValues = this.evaluateAllValues(this._refs);
    const configIndices = this.evaluateAllValues(this._indices);
    const populatedPath = this.populatePath(this._pointer, configValues, configIndices);
    this.graphEngine.processNodeStarted(this);
    if (this.graphEngine.isValidJsonPtr(populatedPath)) {
      const typeName = this.graphEngine.getPathTypeName(populatedPath);
      const configuredTypeName = this.getType(this._typeIndex);
      if (typeName !== configuredTypeName) {
        return {
          "value": { value: this.getDefaultValueForType(configuredTypeName), type: this._typeIndex },
          "isValid": { value: [false], type: this.getTypeIndex("bool") }
        };
      }
      const value = this.graphEngine.getPathValue(populatedPath);
      if (value !== void 0) {
        return {
          "value": { value, type: this._typeIndex },
          "isValid": { value: [true], type: this.getTypeIndex("bool") }
        };
      } else {
        return {
          "value": { value: this.getDefaultValueForType(configuredTypeName), type: this._typeIndex },
          "isValid": { value: [false], type: this.getTypeIndex("bool") }
        };
      }
    } else {
      const typeName = this.getType(this._typeIndex);
      return {
        "value": { value: this.getDefaultValueForType(typeName), type: this._typeIndex },
        "isValid": { value: [false], type: this.getTypeIndex("bool") }
      };
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/pointer/PointerSet.ts
var PointerSet = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { pointer: {}, type: {} };
    this.REQUIRED_VALUES = { value: {} };
    this.name = "PointerSet";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { pointer, type } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._pointer = pointer[0];
    this._typeIndex = type[0];
    this._refs = this.parsePathRefVariables(this._pointer);
    this._indices = this.parsePathIndexVariables(this._pointer);
    if (this.isReadOnlyPointer(this._pointer, this._refs, this._indices)) {
      throw new Error(`Path ${this._pointer} is read only but is included in a pointer/interpolate configuration`);
    }
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const configValues = this.evaluateAllValues(this._refs);
    const configIndices = this.evaluateAllValues(this._indices);
    const requiredValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    const populatedPath = this.populatePath(this._pointer, configValues, configIndices);
    const targetValue = requiredValues.value;
    this.graphEngine.processNodeStarted(this);
    if (this.graphEngine.isValidJsonPtr(populatedPath)) {
      const typeName = this.getType(this._typeIndex);
      const type = this.graphEngine.getPathTypeName(populatedPath);
      if (type !== typeName) {
        if (this.flows.err) {
          this.processFlow(this.flows.err);
        }
        return;
      }
      this.graphEngine.clearPointerInterpolation(populatedPath);
      this.graphEngine.setPathValue(populatedPath, targetValue);
      super.processNode(flowSocket);
    } else {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/Receive.ts
var Receive = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { event: {} };
    this._defaultValues = {};
    this.name = "CustomEventReceiveNode";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { event } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._event = event[0];
    this._eventRefOutput = { value: [`/extensions/KHR_interactivity/events/${this._event + 2}`], type: this.getTypeIndex("ref") };
    this.setUpEventListener();
  }
  setUpEventListener() {
    const { event } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    const customEventDesc = this.events[event[0]];
    const defaultValues = {};
    Object.entries(customEventDesc.values).forEach(([key, value]) => {
      const typeName = this.getType(value.type);
      let defaultVal = this.getDefaultValueForType(typeName);
      if (value.value) {
        defaultVal = value.value;
      }
      defaultValues[key] = {
        value: defaultVal,
        type: value.type
      };
    });
    defaultValues.event = this._eventRefOutput;
    this._defaultValues = defaultValues;
    this.outValues = JSON.parse(JSON.stringify(defaultValues));
    this.graphEngine.addCustomEventListener(`KHR_INTERACTIVITY:${customEventDesc.id}`, (e) => {
      if (this.graphEngine.isEventPropagationCancelled(this._eventRefOutput.value[0])) {
        return;
      }
      this.graphEngine.processNodeStarted(this);
      this.outValues = JSON.parse(JSON.stringify(this._defaultValues));
      const ce = e.detail;
      Object.keys(ce).forEach((ceKey) => {
        const typeIndex = Object.entries(customEventDesc.values).find(([key, _]) => key === ceKey)?.[1]?.type;
        const typeName = this.getType(Number(typeIndex));
        const rawVal = ce[ceKey];
        console.log(`[Receive: ${customEventDesc.id}] Parsing type`, typeName, rawVal);
        const val = this.parseType(typeName, [rawVal]);
        this.outValues[ceKey] = {
          value: val,
          type: typeIndex
        };
      });
      super.processNode();
    });
  }
  parseType(type, val) {
    switch (type) {
      case "bool":
        return [JSON.parse(val[0]) === true];
      case "int":
        return [Number(val[0])];
      case "float":
        return [Number(val[0])];
      case "float2":
        return this.parseMaybeJSON(val[0]);
      case "float3":
        return this.parseMaybeJSON(val[0]);
      case "float4":
        return this.parseMaybeJSON(val[0]);
      case "float2x2":
        return this.parseMaybeJSON(val[0]);
      case "float3x3":
        return this.parseMaybeJSON(val[0]);
      case "float4x4":
        return this.parseMaybeJSON(val[0]);
      default:
        return val;
    }
  }
  parseMaybeJSON(input) {
    try {
      let inputCopy = input;
      if (typeof input === "string") {
        inputCopy = JSON.parse(input);
      }
      if (inputCopy.slice) {
        inputCopy = inputCopy.slice(0);
      } else {
        inputCopy = JSON.parse(JSON.stringify(inputCopy));
      }
      return inputCopy;
    } catch (e) {
      throw new Error("Error while parsing JSON in event/receive");
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/Send.ts
var Send = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { event: {} };
    this.name = "Send";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { event } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._event = event[0];
  }
  processNode(flowSocket) {
    const customEventDesc = this.events[this._event];
    this.graphEngine.clearValueEvaluationCache();
    const vals = this.evaluateAllValues(Object.keys(customEventDesc.values));
    this.graphEngine.processNodeStarted(this);
    this.graphEngine.dispatchCustomEvent(`KHR_INTERACTIVITY:${customEventDesc.id}`, vals);
    super.processNode(flowSocket);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/variable/VariableGet.ts
var VariableGet = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { variable: {} };
    this.name = "VariableGetNode";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { variable } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._variable = variable[0];
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    const variable = this.variables[this._variable];
    return { value: { value: variable.value, type: variable.type } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/variable/VariableSet.ts
var VariableSet = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { variables: {} };
    this.name = "VariableSet";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { variables } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    if (typeof variables[0] === "string") {
      this._variables = JSON.parse(variables);
    } else {
      this._variables = variables;
    }
    if (!Array.isArray(this._variables)) {
      this._variables = [this._variables];
    }
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const vals = this.evaluateAllValues(this._variables.map((variable) => variable.toString()));
    this.graphEngine.processNodeStarted(this);
    for (const variableId of this._variables) {
      this.graphEngine.clearVariableInterpolation(variableId);
      const value = vals[variableId.toString()];
      if (Array.isArray(value)) {
        this.variables[variableId].value = value;
      } else {
        this.variables[variableId].value = [value];
      }
    }
    super.processNode(flowSocket);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/AbsoluteValue.ts
var AbsoluteValue = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "AbsoluteValueNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "int":
        val = [Math.abs(a) | 0];
        break;
      case "float":
        val = [Math.abs(a)];
        break;
      case "float2":
        val = [
          Math.abs(a[0]),
          Math.abs(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.abs(a[0]),
          Math.abs(a[1]),
          Math.abs(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.abs(a[0]),
          Math.abs(a[1]),
          Math.abs(a[2]),
          Math.abs(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.abs(a[0]),
          Math.abs(a[1]),
          Math.abs(a[2]),
          Math.abs(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.abs(a[0]),
          Math.abs(a[1]),
          Math.abs(a[2]),
          Math.abs(a[3]),
          Math.abs(a[4]),
          Math.abs(a[5]),
          Math.abs(a[6]),
          Math.abs(a[7]),
          Math.abs(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.abs(a[0]),
          Math.abs(a[1]),
          Math.abs(a[2]),
          Math.abs(a[3]),
          Math.abs(a[4]),
          Math.abs(a[5]),
          Math.abs(a[6]),
          Math.abs(a[7]),
          Math.abs(a[8]),
          Math.abs(a[9]),
          Math.abs(a[10]),
          Math.abs(a[11]),
          Math.abs(a[12]),
          Math.abs(a[13]),
          Math.abs(a[14]),
          Math.abs(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/constants/Euler.ts
var Euler = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "EulerNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return { "value": { value: [Math.E], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/constants/Pi.ts
var Pi = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "PiNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return { "value": { value: [Math.PI], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/constants/Tau.ts
var Tau = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "TauNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return { "value": { value: [2 * Math.PI], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Sign.ts
var Sign = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "SignNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "int":
      case "float":
        val = [Math.sign(a)];
        break;
      case "float2":
        val = [
          Math.sign(a[0]),
          Math.sign(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.sign(a[0]),
          Math.sign(a[1]),
          Math.sign(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.sign(a[0]),
          Math.sign(a[1]),
          Math.sign(a[2]),
          Math.sign(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.sign(a[0]),
          Math.sign(a[1]),
          Math.sign(a[2]),
          Math.sign(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.sign(a[0]),
          Math.sign(a[1]),
          Math.sign(a[2]),
          Math.sign(a[3]),
          Math.sign(a[4]),
          Math.sign(a[5]),
          Math.sign(a[6]),
          Math.sign(a[7]),
          Math.sign(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.sign(a[0]),
          Math.sign(a[1]),
          Math.sign(a[2]),
          Math.sign(a[3]),
          Math.sign(a[4]),
          Math.sign(a[5]),
          Math.sign(a[6]),
          Math.sign(a[7]),
          Math.sign(a[8]),
          Math.sign(a[9]),
          Math.sign(a[10]),
          Math.sign(a[11]),
          Math.sign(a[12]),
          Math.sign(a[13]),
          Math.sign(a[14]),
          Math.sign(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Truncate.ts
var Truncate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "TruncateNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.trunc(a)];
        break;
      case "float2":
        val = [
          Math.trunc(a[0]),
          Math.trunc(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.trunc(a[0]),
          Math.trunc(a[1]),
          Math.trunc(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.trunc(a[0]),
          Math.trunc(a[1]),
          Math.trunc(a[2]),
          Math.trunc(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.trunc(a[0]),
          Math.trunc(a[1]),
          Math.trunc(a[2]),
          Math.trunc(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.trunc(a[0]),
          Math.trunc(a[1]),
          Math.trunc(a[2]),
          Math.trunc(a[3]),
          Math.trunc(a[4]),
          Math.trunc(a[5]),
          Math.trunc(a[6]),
          Math.trunc(a[7]),
          Math.trunc(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.trunc(a[0]),
          Math.trunc(a[1]),
          Math.trunc(a[2]),
          Math.trunc(a[3]),
          Math.trunc(a[4]),
          Math.trunc(a[5]),
          Math.trunc(a[6]),
          Math.trunc(a[7]),
          Math.trunc(a[8]),
          Math.trunc(a[9]),
          Math.trunc(a[10]),
          Math.trunc(a[11]),
          Math.trunc(a[12]),
          Math.trunc(a[13]),
          Math.trunc(a[14]),
          Math.trunc(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Floor.ts
var Floor = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "FloorNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.floor(a)];
        break;
      case "float2":
        val = [
          Math.floor(a[0]),
          Math.floor(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.floor(a[0]),
          Math.floor(a[1]),
          Math.floor(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.floor(a[0]),
          Math.floor(a[1]),
          Math.floor(a[2]),
          Math.floor(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.floor(a[0]),
          Math.floor(a[1]),
          Math.floor(a[2]),
          Math.floor(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.floor(a[0]),
          Math.floor(a[1]),
          Math.floor(a[2]),
          Math.floor(a[3]),
          Math.floor(a[4]),
          Math.floor(a[5]),
          Math.floor(a[6]),
          Math.floor(a[7]),
          Math.floor(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.floor(a[0]),
          Math.floor(a[1]),
          Math.floor(a[2]),
          Math.floor(a[3]),
          Math.floor(a[4]),
          Math.floor(a[5]),
          Math.floor(a[6]),
          Math.floor(a[7]),
          Math.floor(a[8]),
          Math.floor(a[9]),
          Math.floor(a[10]),
          Math.floor(a[11]),
          Math.floor(a[12]),
          Math.floor(a[13]),
          Math.floor(a[14]),
          Math.floor(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Ceil.ts
var Ceil = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "CeilNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.ceil(a)];
        break;
      case "float2":
        val = [
          Math.ceil(a[0]),
          Math.ceil(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.ceil(a[0]),
          Math.ceil(a[1]),
          Math.ceil(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.ceil(a[0]),
          Math.ceil(a[1]),
          Math.ceil(a[2]),
          Math.ceil(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.ceil(a[0]),
          Math.ceil(a[1]),
          Math.ceil(a[2]),
          Math.ceil(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.ceil(a[0]),
          Math.ceil(a[1]),
          Math.ceil(a[2]),
          Math.ceil(a[3]),
          Math.ceil(a[4]),
          Math.ceil(a[5]),
          Math.ceil(a[6]),
          Math.ceil(a[7]),
          Math.ceil(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.ceil(a[0]),
          Math.ceil(a[1]),
          Math.ceil(a[2]),
          Math.ceil(a[3]),
          Math.ceil(a[4]),
          Math.ceil(a[5]),
          Math.ceil(a[6]),
          Math.ceil(a[7]),
          Math.ceil(a[8]),
          Math.ceil(a[9]),
          Math.ceil(a[10]),
          Math.ceil(a[11]),
          Math.ceil(a[12]),
          Math.ceil(a[13]),
          Math.ceil(a[14]),
          Math.ceil(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Round.ts
var Round = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "RoundNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [round(a)];
        break;
      case "float2":
        val = [
          round(a[0]),
          round(a[1])
        ];
        break;
      case "float3":
        val = [
          round(a[0]),
          round(a[1]),
          round(a[2])
        ];
        break;
      case "float4":
        val = [
          round(a[0]),
          round(a[1]),
          round(a[2]),
          round(a[3])
        ];
        break;
      case "float2x2":
        val = [
          round(a[0]),
          round(a[1]),
          round(a[2]),
          round(a[3])
        ];
        break;
      case "float3x3":
        val = [
          round(a[0]),
          round(a[1]),
          round(a[2]),
          round(a[3]),
          round(a[4]),
          round(a[5]),
          round(a[6]),
          round(a[7]),
          round(a[8])
        ];
        break;
      case "float4x4":
        val = [
          round(a[0]),
          round(a[1]),
          round(a[2]),
          round(a[3]),
          round(a[4]),
          round(a[5]),
          round(a[6]),
          round(a[7]),
          round(a[8]),
          round(a[9]),
          round(a[10]),
          round(a[11]),
          round(a[12]),
          round(a[13]),
          round(a[14]),
          round(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    function round(a2) {
      return a2 < 0 ? -Math.round(-a2) : Math.round(a2);
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Negate.ts
var Negate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "NegateNode";
    this.validateValues(this.values);
  }
  negate(a) {
    return -a | 0;
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "int":
        val = [-a | 0];
        break;
      case "float":
        val = [a * -1];
        break;
      case "float2":
        val = [
          a[0] * -1,
          a[1] * -1
        ];
        break;
      case "float3":
        val = [
          a[0] * -1,
          a[1] * -1,
          a[2] * -1
        ];
        break;
      case "float4":
        val = [
          a[0] * -1,
          a[1] * -1,
          a[2] * -1,
          a[3] * -1
        ];
        break;
      case "float2x2":
        val = [
          a[0] * -1,
          a[1] * -1,
          a[2] * -1,
          a[3] * -1
        ];
        break;
      case "float3x3":
        val = [
          a[0] * -1,
          a[1] * -1,
          a[2] * -1,
          a[3] * -1,
          a[4] * -1,
          a[5] * -1,
          a[6] * -1,
          a[7] * -1,
          a[8] * -1
        ];
        break;
      case "float4x4":
        val = [
          a[0] * -1,
          a[1] * -1,
          a[2] * -1,
          a[3] * -1,
          a[4] * -1,
          a[5] * -1,
          a[6] * -1,
          a[7] * -1,
          a[8] * -1,
          a[9] * -1,
          a[10] * -1,
          a[11] * -1,
          a[12] * -1,
          a[13] * -1,
          a[14] * -1,
          a[15] * -1
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Add.ts
var Add = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "AddNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
        val = [a + b | 0];
        break;
      case "float":
        val = [a + b];
        break;
      case "float2":
        val = [
          a[0] + b[0],
          a[1] + b[1]
        ];
        break;
      case "float3":
        val = [
          a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2]
        ];
        break;
      case "float4":
        val = [
          a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2],
          a[3] + b[3]
        ];
        break;
      case "float2x2":
        val = [
          a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2],
          a[3] + b[3]
        ];
        break;
      case "float3x3":
        val = [
          a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2],
          a[3] + b[3],
          a[4] + b[4],
          a[5] + b[5],
          a[6] + b[6],
          a[7] + b[7],
          a[8] + b[8]
        ];
        break;
      case "float4x4":
        val = [
          a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2],
          a[3] + b[3],
          a[4] + b[4],
          a[5] + b[5],
          a[6] + b[6],
          a[7] + b[7],
          a[8] + b[8],
          a[9] + b[9],
          a[10] + b[10],
          a[11] + b[11],
          a[12] + b[12],
          a[13] + b[13],
          a[14] + b[14],
          a[15] + b[15]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Subtract.ts
var Subtract = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "SubtractNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
        val = [a - b | 0];
        break;
      case "float":
        val = [a - b];
        break;
      case "float2":
        val = [
          a[0] - b[0],
          a[1] - b[1]
        ];
        break;
      case "float3":
        val = [
          a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2]
        ];
        break;
      case "float4":
        val = [
          a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2],
          a[3] - b[3]
        ];
        break;
      case "float2x2":
        val = [
          a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2],
          a[3] - b[3]
        ];
        break;
      case "float3x3":
        val = [
          a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2],
          a[3] - b[3],
          a[4] - b[4],
          a[5] - b[5],
          a[6] - b[6],
          a[7] - b[7],
          a[8] - b[8]
        ];
        break;
      case "float4x4":
        val = [
          a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2],
          a[3] - b[3],
          a[4] - b[4],
          a[5] - b[5],
          a[6] - b[6],
          a[7] - b[7],
          a[8] - b[8],
          a[9] - b[9],
          a[10] - b[10],
          a[11] - b[11],
          a[12] - b[12],
          a[13] - b[13],
          a[14] - b[14],
          a[15] - b[15]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Multiply.ts
var Multiply = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "MultiplyNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
        val = [Math.imul(a, b)];
        break;
      case "float":
        val = [a * b];
        break;
      case "float2":
        val = [
          a[0] * b[0],
          a[1] * b[1]
        ];
        break;
      case "float3":
        val = [
          a[0] * b[0],
          a[1] * b[1],
          a[2] * b[2]
        ];
        break;
      case "float4":
        val = [
          a[0] * b[0],
          a[1] * b[1],
          a[2] * b[2],
          a[3] * b[3]
        ];
        break;
      case "float2x2":
        val = [
          a[0] * b[0],
          a[1] * b[1],
          a[2] * b[2],
          a[3] * b[3]
        ];
        break;
      case "float3x3":
        val = [
          a[0] * b[0],
          a[1] * b[1],
          a[2] * b[2],
          a[3] * b[3],
          a[4] * b[4],
          a[5] * b[5],
          a[6] * b[6],
          a[7] * b[7],
          a[8] * b[8]
        ];
        break;
      case "float4x4":
        val = [
          a[0] * b[0],
          a[1] * b[1],
          a[2] * b[2],
          a[3] * b[3],
          a[4] * b[4],
          a[5] * b[5],
          a[6] * b[6],
          a[7] * b[7],
          a[8] * b[8],
          a[9] * b[9],
          a[10] * b[10],
          a[11] * b[11],
          a[12] * b[12],
          a[13] * b[13],
          a[14] * b[14],
          a[15] * b[15]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Divide.ts
var Divide = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "DivideNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
        val = [a / b | 0];
        break;
      case "float":
        val = [a / b];
        break;
      case "float2":
        val = [
          a[0] / b[0],
          a[1] / b[1]
        ];
        break;
      case "float3":
        val = [
          a[0] / b[0],
          a[1] / b[1],
          a[2] / b[2]
        ];
        break;
      case "float4":
        val = [
          a[0] / b[0],
          a[1] / b[1],
          a[2] / b[2],
          a[3] / b[3]
        ];
        break;
      case "float2x2":
        val = [
          a[0] / b[0],
          a[1] / b[1],
          a[2] / b[2],
          a[3] / b[3]
        ];
        break;
      case "float3x3":
        val = [
          a[0] / b[0],
          a[1] / b[1],
          a[2] / b[2],
          a[3] / b[3],
          a[4] / b[4],
          a[5] / b[5],
          a[6] / b[6],
          a[7] / b[7],
          a[8] / b[8]
        ];
        break;
      case "float4x4":
        val = [
          a[0] / b[0],
          a[1] / b[1],
          a[2] / b[2],
          a[3] / b[3],
          a[4] / b[4],
          a[5] / b[5],
          a[6] / b[6],
          a[7] / b[7],
          a[8] / b[8],
          a[9] / b[9],
          a[10] / b[10],
          a[11] / b[11],
          a[12] / b[12],
          a[13] / b[13],
          a[14] / b[14],
          a[15] / b[15]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Remainder.ts
var Remainder = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "RemainderNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
        val = [a % b | 0];
        break;
      case "float":
        val = [a % b];
        break;
      case "float2":
        val = [
          a[0] % b[0],
          a[1] % b[1]
        ];
        break;
      case "float3":
        val = [
          a[0] % b[0],
          a[1] % b[1],
          a[2] % b[2]
        ];
        break;
      case "float4":
        val = [
          a[0] % b[0],
          a[1] % b[1],
          a[2] % b[2],
          a[3] % b[3]
        ];
        break;
      case "float2x2":
        val = [
          a[0] % b[0],
          a[1] % b[1],
          a[2] % b[2],
          a[3] % b[3]
        ];
        break;
      case "float3x3":
        val = [
          a[0] % b[0],
          a[1] % b[1],
          a[2] % b[2],
          a[3] % b[3],
          a[4] % b[4],
          a[5] % b[5],
          a[6] % b[6],
          a[7] % b[7],
          a[8] % b[8]
        ];
        break;
      case "float4x4":
        val = [
          a[0] % b[0],
          a[1] % b[1],
          a[2] % b[2],
          a[3] % b[3],
          a[4] % b[4],
          a[5] % b[5],
          a[6] % b[6],
          a[7] % b[7],
          a[8] % b[8],
          a[9] % b[9],
          a[10] % b[10],
          a[11] % b[11],
          a[12] % b[12],
          a[13] % b[13],
          a[14] % b[14],
          a[15] % b[15]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Min.ts
var Min = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "MinNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = [Math.min(a, b)];
        break;
      case "float2":
        val = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1])
        ];
        break;
      case "float3":
        val = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.min(a[2], b[2])
        ];
        break;
      case "float4":
        val = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.min(a[2], b[2]),
          Math.min(a[3], b[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.min(a[2], b[2]),
          Math.min(a[3], b[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.min(a[2], b[2]),
          Math.min(a[3], b[3]),
          Math.min(a[4], b[4]),
          Math.min(a[5], b[5]),
          Math.min(a[6], b[6]),
          Math.min(a[7], b[7]),
          Math.min(a[8], b[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.min(a[2], b[2]),
          Math.min(a[3], b[3]),
          Math.min(a[4], b[4]),
          Math.min(a[5], b[5]),
          Math.min(a[6], b[6]),
          Math.min(a[7], b[7]),
          Math.min(a[8], b[8]),
          Math.min(a[9], b[9]),
          Math.min(a[10], b[10]),
          Math.min(a[11], b[11]),
          Math.min(a[12], b[12]),
          Math.min(a[13], b[13]),
          Math.min(a[14], b[14]),
          Math.min(a[15], b[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Max.ts
var Max = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "MaxNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = [Math.max(a, b)];
        break;
      case "float2":
        val = [
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1])
        ];
        break;
      case "float3":
        val = [
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1]),
          Math.max(a[2], b[2])
        ];
        break;
      case "float4":
        val = [
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1]),
          Math.max(a[2], b[2]),
          Math.max(a[3], b[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1]),
          Math.max(a[2], b[2]),
          Math.max(a[3], b[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1]),
          Math.max(a[2], b[2]),
          Math.max(a[3], b[3]),
          Math.max(a[4], b[4]),
          Math.max(a[5], b[5]),
          Math.max(a[6], b[6]),
          Math.max(a[7], b[7]),
          Math.max(a[8], b[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1]),
          Math.max(a[2], b[2]),
          Math.max(a[3], b[3]),
          Math.max(a[4], b[4]),
          Math.max(a[5], b[5]),
          Math.max(a[6], b[6]),
          Math.max(a[7], b[7]),
          Math.max(a[8], b[8]),
          Math.max(a[9], b[9]),
          Math.max(a[10], b[10]),
          Math.max(a[11], b[11]),
          Math.max(a[12], b[12]),
          Math.max(a[13], b[13]),
          Math.max(a[14], b[14]),
          Math.max(a[15], b[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Mix.ts
var Mix = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {} };
    this.mix = (a, b, t) => {
      return a + t * (b - a);
    };
    this.name = "MixNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "float":
        val = [this.mix(a, b, c)];
        break;
      case "float2":
        val = [
          this.mix(a[0], b[0], c[0]),
          this.mix(a[1], b[1], c[1])
        ];
        break;
      case "float3":
        val = [
          this.mix(a[0], b[0], c[0]),
          this.mix(a[1], b[1], c[1]),
          this.mix(a[2], b[2], c[2])
        ];
        break;
      case "float4":
        val = [
          this.mix(a[0], b[0], c[0]),
          this.mix(a[1], b[1], c[1]),
          this.mix(a[2], b[2], c[2]),
          this.mix(a[3], b[3], c[3])
        ];
        break;
      case "float2x2":
        val = [
          this.mix(a[0], b[0], c[0]),
          this.mix(a[1], b[1], c[1]),
          this.mix(a[2], b[2], c[2]),
          this.mix(a[3], b[3], c[3])
        ];
        break;
      case "float3x3":
        val = [
          this.mix(a[0], b[0], c[0]),
          this.mix(a[1], b[1], c[1]),
          this.mix(a[2], b[2], c[2]),
          this.mix(a[3], b[3], c[3]),
          this.mix(a[4], b[4], c[4]),
          this.mix(a[5], b[5], c[5]),
          this.mix(a[6], b[6], c[6]),
          this.mix(a[7], b[7], c[7]),
          this.mix(a[8], b[8], c[8])
        ];
        break;
      case "float4x4":
        val = [
          this.mix(a[0], b[0], c[0]),
          this.mix(a[1], b[1], c[1]),
          this.mix(a[2], b[2], c[2]),
          this.mix(a[3], b[3], c[3]),
          this.mix(a[4], b[4], c[4]),
          this.mix(a[5], b[5], c[5]),
          this.mix(a[6], b[6], c[6]),
          this.mix(a[7], b[7], c[7]),
          this.mix(a[8], b[8], c[8]),
          this.mix(a[9], b[9], c[9]),
          this.mix(a[10], b[10], c[10]),
          this.mix(a[11], b[11], c[11]),
          this.mix(a[12], b[12], c[12]),
          this.mix(a[13], b[13], c[13]),
          this.mix(a[14], b[14], c[14]),
          this.mix(a[15], b[15], c[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Saturate.ts
var Saturate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "SaturateNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.min(Math.max(a, 0), 1)];
        break;
      case "float2":
        val = [
          Math.min(Math.max(a[0], 0), 1),
          Math.min(Math.max(a[1], 0), 1)
        ];
        break;
      case "float3":
        val = [
          Math.min(Math.max(a[0], 0), 1),
          Math.min(Math.max(a[1], 0), 1),
          Math.min(Math.max(a[2], 0), 1)
        ];
        break;
      case "float4":
        val = [
          Math.min(Math.max(a[0], 0), 1),
          Math.min(Math.max(a[1], 0), 1),
          Math.min(Math.max(a[2], 0), 1),
          Math.min(Math.max(a[3], 0), 1)
        ];
        break;
      case "float2x2":
        val = [
          Math.min(Math.max(a[0], 0), 1),
          Math.min(Math.max(a[1], 0), 1),
          Math.min(Math.max(a[2], 0), 1),
          Math.min(Math.max(a[3], 0), 1)
        ];
        break;
      case "float3x3":
        val = [
          Math.min(Math.max(a[0], 0), 1),
          Math.min(Math.max(a[1], 0), 1),
          Math.min(Math.max(a[2], 0), 1),
          Math.min(Math.max(a[3], 0), 1),
          Math.min(Math.max(a[4], 0), 1),
          Math.min(Math.max(a[5], 0), 1),
          Math.min(Math.max(a[6], 0), 1),
          Math.min(Math.max(a[7], 0), 1),
          Math.min(Math.max(a[8], 0), 1)
        ];
        break;
      case "float4x4":
        val = [
          Math.min(Math.max(a[0], 0), 1),
          Math.min(Math.max(a[1], 0), 1),
          Math.min(Math.max(a[2], 0), 1),
          Math.min(Math.max(a[3], 0), 1),
          Math.min(Math.max(a[4], 0), 1),
          Math.min(Math.max(a[5], 0), 1),
          Math.min(Math.max(a[6], 0), 1),
          Math.min(Math.max(a[7], 0), 1),
          Math.min(Math.max(a[8], 0), 1),
          Math.min(Math.max(a[9], 0), 1),
          Math.min(Math.max(a[10], 0), 1),
          Math.min(Math.max(a[11], 0), 1),
          Math.min(Math.max(a[12], 0), 1),
          Math.min(Math.max(a[13], 0), 1),
          Math.min(Math.max(a[14], 0), 1),
          Math.min(Math.max(a[15], 0), 1)
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Clamp.ts
var Clamp = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {} };
    this.name = "ClampNode";
    this.validateValues(this.values);
  }
  clamp(a, b, c) {
    return Math.min(Math.max(a, Math.min(b, c)), Math.max(b, c));
  }
  processNode(flowSocket) {
    const { a, b, c } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const typeIndexC = this.values["c"].type;
    const typeC = this.getType(typeIndexC);
    if (typeA !== typeB || typeB !== typeC) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = [this.clamp(a, b, c)];
        break;
      case "float2":
        val = [
          this.clamp(a[0], b[0], c[0]),
          this.clamp(a[1], b[1], c[1])
        ];
        break;
      case "float3":
        val = [
          this.clamp(a[0], b[0], c[0]),
          this.clamp(a[1], b[1], c[1]),
          this.clamp(a[2], b[2], c[2])
        ];
        break;
      case "float4":
        val = [
          this.clamp(a[0], b[0], c[0]),
          this.clamp(a[1], b[1], c[1]),
          this.clamp(a[2], b[2], c[2]),
          this.clamp(a[3], b[3], c[3])
        ];
        break;
      case "float2x2":
        val = [
          this.clamp(a[0], b[0], c[0]),
          this.clamp(a[1], b[1], c[1]),
          this.clamp(a[2], b[2], c[2]),
          this.clamp(a[3], b[3], c[3])
        ];
        break;
      case "float3x3":
        val = [
          this.clamp(a[0], b[0], c[0]),
          this.clamp(a[1], b[1], c[1]),
          this.clamp(a[2], b[2], c[2]),
          this.clamp(a[3], b[3], c[3]),
          this.clamp(a[4], b[4], c[4]),
          this.clamp(a[5], b[5], c[5]),
          this.clamp(a[6], b[6], c[6]),
          this.clamp(a[7], b[7], c[7]),
          this.clamp(a[8], b[8], c[8])
        ];
        break;
      case "float4x4":
        val = [
          this.clamp(a[0], b[0], c[0]),
          this.clamp(a[1], b[1], c[1]),
          this.clamp(a[2], b[2], c[2]),
          this.clamp(a[3], b[3], c[3]),
          this.clamp(a[4], b[4], c[4]),
          this.clamp(a[5], b[5], c[5]),
          this.clamp(a[6], b[6], c[6]),
          this.clamp(a[7], b[7], c[7]),
          this.clamp(a[8], b[8], c[8]),
          this.clamp(a[9], b[9], c[9]),
          this.clamp(a[10], b[10], c[10]),
          this.clamp(a[11], b[11], c[11]),
          this.clamp(a[12], b[12], c[12]),
          this.clamp(a[13], b[13], c[13]),
          this.clamp(a[14], b[14], c[14]),
          this.clamp(a[15], b[15], c[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/DegreeToRadians.ts
var DegreeToRadians = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "DegreeToRadiansNode";
    this.validateValues(this.values);
  }
  degreeToRadians(a) {
    return a * Math.PI / 180;
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [this.degreeToRadians(a)];
        break;
      case "float2":
        val = [
          this.degreeToRadians(a[0]),
          this.degreeToRadians(a[1])
        ];
        break;
      case "float3":
        val = [
          this.degreeToRadians(a[0]),
          this.degreeToRadians(a[1]),
          this.degreeToRadians(a[2])
        ];
        break;
      case "float4":
        val = [
          this.degreeToRadians(a[0]),
          this.degreeToRadians(a[1]),
          this.degreeToRadians(a[2]),
          this.degreeToRadians(a[3])
        ];
        break;
      case "float2x2":
        val = [
          this.degreeToRadians(a[0]),
          this.degreeToRadians(a[1]),
          this.degreeToRadians(a[2]),
          this.degreeToRadians(a[3])
        ];
        break;
      case "float3x3":
        val = [
          this.degreeToRadians(a[0]),
          this.degreeToRadians(a[1]),
          this.degreeToRadians(a[2]),
          this.degreeToRadians(a[3]),
          this.degreeToRadians(a[4]),
          this.degreeToRadians(a[5]),
          this.degreeToRadians(a[6]),
          this.degreeToRadians(a[7]),
          this.degreeToRadians(a[8])
        ];
        break;
      case "float4x4":
        val = [
          this.degreeToRadians(a[0]),
          this.degreeToRadians(a[1]),
          this.degreeToRadians(a[2]),
          this.degreeToRadians(a[3]),
          this.degreeToRadians(a[4]),
          this.degreeToRadians(a[5]),
          this.degreeToRadians(a[6]),
          this.degreeToRadians(a[7]),
          this.degreeToRadians(a[8]),
          this.degreeToRadians(a[9]),
          this.degreeToRadians(a[10]),
          this.degreeToRadians(a[11]),
          this.degreeToRadians(a[12]),
          this.degreeToRadians(a[13]),
          this.degreeToRadians(a[14]),
          this.degreeToRadians(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/RadiansToDegrees.ts
var RadiansToDegrees = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "RadiansToDegreesNode";
    this.validateValues(this.values);
  }
  radiansToDegrees(a) {
    return a * 180 / Math.PI;
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [this.radiansToDegrees(a)];
        break;
      case "float2":
        val = [
          this.radiansToDegrees(a[0]),
          this.radiansToDegrees(a[1])
        ];
        break;
      case "float3":
        val = [
          this.radiansToDegrees(a[0]),
          this.radiansToDegrees(a[1]),
          this.radiansToDegrees(a[2])
        ];
        break;
      case "float4":
        val = [
          this.radiansToDegrees(a[0]),
          this.radiansToDegrees(a[1]),
          this.radiansToDegrees(a[2]),
          this.radiansToDegrees(a[3])
        ];
        break;
      case "float2x2":
        val = [
          this.radiansToDegrees(a[0]),
          this.radiansToDegrees(a[1]),
          this.radiansToDegrees(a[2]),
          this.radiansToDegrees(a[3])
        ];
        break;
      case "float3x3":
        val = [
          this.radiansToDegrees(a[0]),
          this.radiansToDegrees(a[1]),
          this.radiansToDegrees(a[2]),
          this.radiansToDegrees(a[3]),
          this.radiansToDegrees(a[4]),
          this.radiansToDegrees(a[5]),
          this.radiansToDegrees(a[6]),
          this.radiansToDegrees(a[7]),
          this.radiansToDegrees(a[8])
        ];
        break;
      case "float4x4":
        val = [
          this.radiansToDegrees(a[0]),
          this.radiansToDegrees(a[1]),
          this.radiansToDegrees(a[2]),
          this.radiansToDegrees(a[3]),
          this.radiansToDegrees(a[4]),
          this.radiansToDegrees(a[5]),
          this.radiansToDegrees(a[6]),
          this.radiansToDegrees(a[7]),
          this.radiansToDegrees(a[8]),
          this.radiansToDegrees(a[9]),
          this.radiansToDegrees(a[10]),
          this.radiansToDegrees(a[11]),
          this.radiansToDegrees(a[12]),
          this.radiansToDegrees(a[13]),
          this.radiansToDegrees(a[14]),
          this.radiansToDegrees(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Sine.ts
var Sine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "SineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.sin(a)];
        break;
      case "float2":
        val = [
          Math.sin(a[0]),
          Math.sin(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.sin(a[0]),
          Math.sin(a[1]),
          Math.sin(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.sin(a[0]),
          Math.sin(a[1]),
          Math.sin(a[2]),
          Math.sin(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.sin(a[0]),
          Math.sin(a[1]),
          Math.sin(a[2]),
          Math.sin(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.sin(a[0]),
          Math.sin(a[1]),
          Math.sin(a[2]),
          Math.sin(a[3]),
          Math.sin(a[4]),
          Math.sin(a[5]),
          Math.sin(a[6]),
          Math.sin(a[7]),
          Math.sin(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.sin(a[0]),
          Math.sin(a[1]),
          Math.sin(a[2]),
          Math.sin(a[3]),
          Math.sin(a[4]),
          Math.sin(a[5]),
          Math.sin(a[6]),
          Math.sin(a[7]),
          Math.sin(a[8]),
          Math.sin(a[9]),
          Math.sin(a[10]),
          Math.sin(a[11]),
          Math.sin(a[12]),
          Math.sin(a[13]),
          Math.sin(a[14]),
          Math.sin(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Cosine.ts
var Cosine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "CosineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.cos(a)];
        break;
      case "float2":
        val = [
          Math.cos(a[0]),
          Math.cos(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.cos(a[0]),
          Math.cos(a[1]),
          Math.cos(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.cos(a[0]),
          Math.cos(a[1]),
          Math.cos(a[2]),
          Math.cos(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.cos(a[0]),
          Math.cos(a[1]),
          Math.cos(a[2]),
          Math.cos(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.cos(a[0]),
          Math.cos(a[1]),
          Math.cos(a[2]),
          Math.cos(a[3]),
          Math.cos(a[4]),
          Math.cos(a[5]),
          Math.cos(a[6]),
          Math.cos(a[7]),
          Math.cos(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.cos(a[0]),
          Math.cos(a[1]),
          Math.cos(a[2]),
          Math.cos(a[3]),
          Math.cos(a[4]),
          Math.cos(a[5]),
          Math.cos(a[6]),
          Math.cos(a[7]),
          Math.cos(a[8]),
          Math.cos(a[9]),
          Math.cos(a[10]),
          Math.cos(a[11]),
          Math.cos(a[12]),
          Math.cos(a[13]),
          Math.cos(a[14]),
          Math.cos(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Tangent.ts
var Tangent = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "TangentNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.tan(a)];
        break;
      case "float2":
        val = [
          Math.tan(a[0]),
          Math.tan(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.tan(a[0]),
          Math.tan(a[1]),
          Math.tan(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.tan(a[0]),
          Math.tan(a[1]),
          Math.tan(a[2]),
          Math.tan(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.tan(a[0]),
          Math.tan(a[1]),
          Math.tan(a[2]),
          Math.tan(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.tan(a[0]),
          Math.tan(a[1]),
          Math.tan(a[2]),
          Math.tan(a[3]),
          Math.tan(a[4]),
          Math.tan(a[5]),
          Math.tan(a[6]),
          Math.tan(a[7]),
          Math.tan(a[8]),
          Math.tan(a[12]),
          Math.tan(a[13]),
          Math.tan(a[14])
        ];
        break;
      case "float4x4":
        val = [
          Math.tan(a[0]),
          Math.tan(a[1]),
          Math.tan(a[2]),
          Math.tan(a[3]),
          Math.tan(a[4]),
          Math.tan(a[5]),
          Math.tan(a[6]),
          Math.tan(a[7]),
          Math.tan(a[8]),
          Math.tan(a[9]),
          Math.tan(a[10]),
          Math.tan(a[11]),
          Math.tan(a[12]),
          Math.tan(a[13]),
          Math.tan(a[14]),
          Math.tan(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Arcsine.ts
var Arcsine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "ArcsineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.asin(a)];
        break;
      case "float2":
        val = [
          Math.asin(a[0]),
          Math.asin(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.asin(a[0]),
          Math.asin(a[1]),
          Math.asin(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.asin(a[0]),
          Math.asin(a[1]),
          Math.asin(a[2]),
          Math.asin(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.asin(a[0]),
          Math.asin(a[1]),
          Math.asin(a[2]),
          Math.asin(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.asin(a[0]),
          Math.asin(a[1]),
          Math.asin(a[2]),
          Math.asin(a[3]),
          Math.asin(a[4]),
          Math.asin(a[5]),
          Math.asin(a[6]),
          Math.asin(a[7]),
          Math.asin(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.asin(a[0]),
          Math.asin(a[1]),
          Math.asin(a[2]),
          Math.asin(a[3]),
          Math.asin(a[4]),
          Math.asin(a[5]),
          Math.asin(a[6]),
          Math.asin(a[7]),
          Math.asin(a[8]),
          Math.asin(a[9]),
          Math.asin(a[10]),
          Math.asin(a[11]),
          Math.asin(a[12]),
          Math.asin(a[13]),
          Math.asin(a[14]),
          Math.asin(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Arccosine.ts
var Arccosine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "ArccosineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.acos(a)];
        break;
      case "float2":
        val = [
          Math.acos(a[0]),
          Math.acos(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.acos(a[0]),
          Math.acos(a[1]),
          Math.acos(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.acos(a[0]),
          Math.acos(a[1]),
          Math.acos(a[2]),
          Math.acos(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.acos(a[0]),
          Math.acos(a[1]),
          Math.acos(a[2]),
          Math.acos(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.acos(a[0]),
          Math.acos(a[1]),
          Math.acos(a[2]),
          Math.acos(a[3]),
          Math.acos(a[4]),
          Math.acos(a[5]),
          Math.acos(a[6]),
          Math.acos(a[7]),
          Math.acos(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.acos(a[0]),
          Math.acos(a[1]),
          Math.acos(a[2]),
          Math.acos(a[3]),
          Math.acos(a[4]),
          Math.acos(a[5]),
          Math.acos(a[6]),
          Math.acos(a[7]),
          Math.acos(a[8]),
          Math.acos(a[9]),
          Math.acos(a[10]),
          Math.acos(a[11]),
          Math.acos(a[12]),
          Math.acos(a[13]),
          Math.acos(a[14]),
          Math.acos(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Arctangent.ts
var Arctangent = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "ArctangentNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.atan(a)];
        break;
      case "float2":
        val = [
          Math.atan(a[0]),
          Math.atan(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.atan(a[0]),
          Math.atan(a[1]),
          Math.atan(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.atan(a[0]),
          Math.atan(a[1]),
          Math.atan(a[2]),
          Math.atan(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.atan(a[0]),
          Math.atan(a[1]),
          Math.atan(a[2]),
          Math.atan(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.atan(a[0]),
          Math.atan(a[1]),
          Math.atan(a[2]),
          Math.atan(a[3]),
          Math.atan(a[4]),
          Math.atan(a[5]),
          Math.atan(a[6]),
          Math.atan(a[7]),
          Math.atan(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.atan(a[0]),
          Math.atan(a[1]),
          Math.atan(a[2]),
          Math.atan(a[3]),
          Math.atan(a[4]),
          Math.atan(a[5]),
          Math.atan(a[6]),
          Math.atan(a[7]),
          Math.atan(a[8]),
          Math.atan(a[9]),
          Math.atan(a[10]),
          Math.atan(a[11]),
          Math.atan(a[12]),
          Math.atan(a[13]),
          Math.atan(a[14]),
          Math.atan(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/trigonometry/Arctangent2.ts
var Arctangent2 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "Arctangent2Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeAIndex = this.values["a"].type;
    const typeA = this.getType(typeAIndex);
    const typeBIndex = this.values["b"].type;
    const typeB = this.getType(typeBIndex);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "float":
        val = [Math.atan2(a, b)];
        break;
      case "float2":
        val = [
          Math.atan2(a[0], b[0]),
          Math.atan2(a[1], b[1])
        ];
        break;
      case "float3":
        val = [
          Math.atan2(a[0], b[0]),
          Math.atan2(a[1], b[1]),
          Math.atan2(a[2], b[2])
        ];
        break;
      case "float4":
        val = [
          Math.atan2(a[0], b[0]),
          Math.atan2(a[1], b[1]),
          Math.atan2(a[2], b[2]),
          Math.atan2(a[3], b[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.atan2(a[0], b[0]),
          Math.atan2(a[1], b[1]),
          Math.atan2(a[2], b[2]),
          Math.atan2(a[3], b[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.atan2(a[0], b[0]),
          Math.atan2(a[1], b[1]),
          Math.atan2(a[2], b[2]),
          Math.atan2(a[3], b[3]),
          Math.atan2(a[4], b[4]),
          Math.atan2(a[5], b[5]),
          Math.atan2(a[6], b[6]),
          Math.atan2(a[7], b[7]),
          Math.atan2(a[8], b[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.atan2(a[0], b[0]),
          Math.atan2(a[1], b[1]),
          Math.atan2(a[2], b[2]),
          Math.atan2(a[3], b[3]),
          Math.atan2(a[4], b[4]),
          Math.atan2(a[5], b[5]),
          Math.atan2(a[6], b[6]),
          Math.atan2(a[7], b[7]),
          Math.atan2(a[8], b[8]),
          Math.atan2(a[9], b[9]),
          Math.atan2(a[10], b[10]),
          Math.atan2(a[11], b[11]),
          Math.atan2(a[12], b[12]),
          Math.atan2(a[13], b[13]),
          Math.atan2(a[14], b[14]),
          Math.atan2(a[15], b[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeAIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/Log.ts
var Log = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "LogNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.log(a)];
        break;
      case "float2":
        val = [
          Math.log(a[0]),
          Math.log(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.log(a[0]),
          Math.log(a[1]),
          Math.log(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.log(a[0]),
          Math.log(a[1]),
          Math.log(a[2]),
          Math.log(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.log(a[0]),
          Math.log(a[1]),
          Math.log(a[2]),
          Math.log(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.log(a[0]),
          Math.log(a[1]),
          Math.log(a[2]),
          Math.log(a[3]),
          Math.log(a[4]),
          Math.log(a[5]),
          Math.log(a[6]),
          Math.log(a[7]),
          Math.log(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.log(a[0]),
          Math.log(a[1]),
          Math.log(a[2]),
          Math.log(a[3]),
          Math.log(a[4]),
          Math.log(a[5]),
          Math.log(a[6]),
          Math.log(a[7]),
          Math.log(a[8]),
          Math.log(a[9]),
          Math.log(a[10]),
          Math.log(a[11]),
          Math.log(a[12]),
          Math.log(a[13]),
          Math.log(a[14]),
          Math.log(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/Log2.ts
var Log2 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Log2Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.log2(a)];
        break;
      case "float2":
        val = [
          Math.log2(a[0]),
          Math.log2(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.log2(a[0]),
          Math.log2(a[1]),
          Math.log2(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.log2(a[0]),
          Math.log2(a[1]),
          Math.log2(a[2]),
          Math.log2(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.log2(a[0]),
          Math.log2(a[1]),
          Math.log2(a[2]),
          Math.log2(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.log2(a[0]),
          Math.log2(a[1]),
          Math.log2(a[2]),
          Math.log2(a[3]),
          Math.log2(a[4]),
          Math.log2(a[5]),
          Math.log2(a[6]),
          Math.log2(a[7]),
          Math.log2(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.log2(a[0]),
          Math.log2(a[1]),
          Math.log2(a[2]),
          Math.log2(a[3]),
          Math.log2(a[4]),
          Math.log2(a[5]),
          Math.log2(a[6]),
          Math.log2(a[7]),
          Math.log2(a[8]),
          Math.log2(a[9]),
          Math.log2(a[10]),
          Math.log2(a[11]),
          Math.log2(a[12]),
          Math.log2(a[13]),
          Math.log2(a[14]),
          Math.log2(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/Log10.ts
var Log10 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Log10Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.log10(a)];
        break;
      case "float2":
        val = [
          Math.log10(a[0]),
          Math.log10(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.log10(a[0]),
          Math.log10(a[1]),
          Math.log10(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.log10(a[0]),
          Math.log10(a[1]),
          Math.log10(a[2]),
          Math.log10(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.log10(a[0]),
          Math.log10(a[1]),
          Math.log10(a[2]),
          Math.log10(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.log10(a[0]),
          Math.log10(a[1]),
          Math.log10(a[2]),
          Math.log10(a[3]),
          Math.log10(a[4]),
          Math.log10(a[5]),
          Math.log10(a[6]),
          Math.log10(a[7]),
          Math.log10(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.log10(a[0]),
          Math.log10(a[1]),
          Math.log10(a[2]),
          Math.log10(a[3]),
          Math.log10(a[4]),
          Math.log10(a[5]),
          Math.log10(a[6]),
          Math.log10(a[7]),
          Math.log10(a[8]),
          Math.log10(a[9]),
          Math.log10(a[10]),
          Math.log10(a[11]),
          Math.log10(a[12]),
          Math.log10(a[13]),
          Math.log10(a[14]),
          Math.log10(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/Power.ts
var Power = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "PowerNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "float":
        val = [Math.pow(a, b)];
        break;
      case "float2":
        val = [
          Math.pow(a[0], b[0]),
          Math.pow(a[1], b[1])
        ];
        break;
      case "float3":
        val = [
          Math.pow(a[0], b[0]),
          Math.pow(a[1], b[1]),
          Math.pow(a[2], b[2])
        ];
        break;
      case "float4":
        val = [
          Math.pow(a[0], b[0]),
          Math.pow(a[1], b[1]),
          Math.pow(a[2], b[2]),
          Math.pow(a[3], b[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.pow(a[0], b[0]),
          Math.pow(a[1], b[1]),
          Math.pow(a[2], b[2]),
          Math.pow(a[3], b[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.pow(a[0], b[0]),
          Math.pow(a[1], b[1]),
          Math.pow(a[2], b[2]),
          Math.pow(a[3], b[3]),
          Math.pow(a[4], b[4]),
          Math.pow(a[5], b[5]),
          Math.pow(a[6], b[6]),
          Math.pow(a[7], b[7]),
          Math.pow(a[8], b[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.pow(a[0], b[0]),
          Math.pow(a[1], b[1]),
          Math.pow(a[2], b[2]),
          Math.pow(a[3], b[3]),
          Math.pow(a[4], b[4]),
          Math.pow(a[5], b[5]),
          Math.pow(a[6], b[6]),
          Math.pow(a[7], b[7]),
          Math.pow(a[8], b[8]),
          Math.pow(a[9], b[9]),
          Math.pow(a[10], b[10]),
          Math.pow(a[11], b[11]),
          Math.pow(a[12], b[12]),
          Math.pow(a[13], b[13]),
          Math.pow(a[14], b[14]),
          Math.pow(a[15], b[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/SquareRoot.ts
var SquareRoot = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "SquareRootNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.sqrt(a)];
        break;
      case "float2":
        val = [
          Math.sqrt(a[0]),
          Math.sqrt(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.sqrt(a[0]),
          Math.sqrt(a[1]),
          Math.sqrt(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.sqrt(a[0]),
          Math.sqrt(a[1]),
          Math.sqrt(a[2]),
          Math.sqrt(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.sqrt(a[0]),
          Math.sqrt(a[1]),
          Math.sqrt(a[2]),
          Math.sqrt(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.sqrt(a[0]),
          Math.sqrt(a[1]),
          Math.sqrt(a[2]),
          Math.sqrt(a[3]),
          Math.sqrt(a[4]),
          Math.sqrt(a[5]),
          Math.sqrt(a[6]),
          Math.sqrt(a[7]),
          Math.sqrt(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.sqrt(a[0]),
          Math.sqrt(a[1]),
          Math.sqrt(a[2]),
          Math.sqrt(a[3]),
          Math.sqrt(a[4]),
          Math.sqrt(a[5]),
          Math.sqrt(a[6]),
          Math.sqrt(a[7]),
          Math.sqrt(a[8]),
          Math.sqrt(a[9]),
          Math.sqrt(a[10]),
          Math.sqrt(a[11]),
          Math.sqrt(a[12]),
          Math.sqrt(a[13]),
          Math.sqrt(a[14]),
          Math.sqrt(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/CubeRoot.ts
var CubeRoot = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "CubeRootNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.cbrt(a)];
        break;
      case "float2":
        val = [
          Math.cbrt(a[0]),
          Math.cbrt(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.cbrt(a[0]),
          Math.cbrt(a[1]),
          Math.cbrt(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.cbrt(a[0]),
          Math.cbrt(a[1]),
          Math.cbrt(a[2]),
          Math.cbrt(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.cbrt(a[0]),
          Math.cbrt(a[1]),
          Math.cbrt(a[2]),
          Math.cbrt(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.cbrt(a[0]),
          Math.cbrt(a[1]),
          Math.cbrt(a[2]),
          Math.cbrt(a[3]),
          Math.cbrt(a[4]),
          Math.cbrt(a[5]),
          Math.cbrt(a[6]),
          Math.cbrt(a[7]),
          Math.cbrt(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.cbrt(a[0]),
          Math.cbrt(a[1]),
          Math.cbrt(a[2]),
          Math.cbrt(a[3]),
          Math.cbrt(a[4]),
          Math.cbrt(a[5]),
          Math.cbrt(a[6]),
          Math.cbrt(a[7]),
          Math.cbrt(a[8]),
          Math.cbrt(a[9]),
          Math.cbrt(a[10]),
          Math.cbrt(a[11]),
          Math.cbrt(a[12]),
          Math.cbrt(a[13]),
          Math.cbrt(a[14]),
          Math.cbrt(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/Random.ts
var Random = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "RandomNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return { "value": { id: "value", value: [Math.random()], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Dot.ts
var Dot = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "DotNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "float2":
        val = a[0] * b[0] + a[1] * b[1];
        break;
      case "float3":
        val = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        break;
      case "float4":
        val = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Cross.ts
var Cross = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "CrossNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "float3":
        val = [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Normalize.ts
var Normalize = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "NormalizeNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    let isValid = true;
    switch (type) {
      case "float2":
        const length2 = Math.hypot(a[0], a[1]);
        if (length2 === 0 || isNaN(length2) || !isFinite(length2)) {
          val = [0, 0];
          isValid = false;
        } else {
          val = [
            a[0] / length2,
            a[1] / length2
          ];
        }
        break;
      case "float3":
        const length3 = Math.hypot(a[0], a[1], a[2]);
        if (length3 === 0 || isNaN(length3) || !isFinite(length3)) {
          val = [0, 0, 0];
          isValid = false;
        } else {
          val = [
            a[0] / length3,
            a[1] / length3,
            a[2] / length3
          ];
        }
        break;
      case "float4":
        const length4 = Math.hypot(a[0], a[1], a[2], a[3]);
        if (length4 === 0 || isNaN(length4) || !isFinite(length4)) {
          val = [0, 0, 0, 0];
          isValid = false;
        } else {
          val = [
            a[0] / length4,
            a[1] / length4,
            a[2] / length4,
            a[3] / length4
          ];
        }
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex }, "isValid": { value: isValid, type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Rotate2D.ts
var Rotate2D = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, angle: {} };
    this.name = "Rotate2DNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, angle } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexAngle = this.values["angle"].type;
    const typeAngle = this.getType(typeIndexAngle);
    if (typeAngle !== "float") {
      throw Error("Invalid type");
    }
    let val;
    switch (typeA) {
      case "float2":
        const cosTheta = Math.cos(Number(angle));
        const sinTheta = Math.sin(Number(angle));
        const rotationMatrix = [
          [cosTheta, -sinTheta],
          [sinTheta, cosTheta]
        ];
        val = [
          a[0] * rotationMatrix[0][0] + a[1] * rotationMatrix[0][1],
          a[0] * rotationMatrix[1][0] + a[1] * rotationMatrix[1][1]
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Rotate3D.ts
var Rotate3D = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, rotation: {} };
    this.name = "Rotate3DNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, rotation } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexRotation = this.values["rotation"].type;
    const typeRotation = this.getType(typeIndexRotation);
    if (typeA !== "float3") {
      throw Error("a input should be a float3");
    }
    if (typeRotation !== "float4") {
      throw Error("rotation input should be a float4");
    }
    const r = [
      rotation[0],
      rotation[1],
      rotation[2]
    ];
    const rCrossA = this.cross(r, a);
    const rCrossRCrossA = this.cross(r, rCrossA);
    const val = [
      a[0] + 2 * (rCrossRCrossA[0] + rotation[3] * rCrossA[0]),
      a[1] + 2 * (rCrossRCrossA[1] + rotation[3] * rCrossA[1]),
      a[2] + 2 * (rCrossRCrossA[2] + rotation[3] * rCrossA[2])
    ];
    return { "value": { value: val, type: typeIndexA } };
  }
  cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/VectorLength.ts
var VectorLength = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "VectorLengthNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float2":
      case "float3":
      case "float4":
        val = Math.hypot(...a);
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/special/IsInfNode.ts
var IsInfNode = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "IsInfNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = !isFinite(Number(a));
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/special/IsNaNNode.ts
var IsNaNNode = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "IsNaNNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = isNaN(Number(a));
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/comparison/LessThanOrEqualTo.ts
var LessThanOrEqualTo = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "LessOrEqualToNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = a <= b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/comparison/LessThan.ts
var LessThan = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "LessThanNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = a < b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/comparison/Equality.ts
var Equality = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "EqualityNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error(`input types not equivalent: a=${typeA}, b=${typeB}, values=${JSON.stringify(this.values)}`);
    }
    let val;
    switch (typeA) {
      case "bool":
        val = JSON.parse(a) === JSON.parse(b);
        break;
      case "int":
      case "float":
        val = a === b;
        break;
      case "float2":
        val = a[0] === b[0] && a[1] === b[1];
        break;
      case "float3":
        val = a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
        break;
      case "float4":
        val = a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
        break;
      case "float2x2":
        val = a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
        break;
      case "float3x3":
        val = a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
        break;
      case "float4x4":
        val = a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/comparison/GreaterThanOrEqualTo.ts
var GreaterThanOrEqualTo = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "GreaterThanOrEqualToNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = a >= b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { id: "value", value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/comparison/GreaterThan.ts
var GreaterThan = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "GreaterThanNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "int":
      case "float":
        val = a > b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/constants/Inf.ts
var Inf = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "InfNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return { "value": { value: [Infinity], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/SetDelay.ts
var SetDelay = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { duration: {} };
    this.name = "SetDelay";
    this.validateValues(this.values);
    this._runningDelayIndices = [];
    this.outValues.lastDelay = { value: [null], type: this.getTypeIndex("ref") };
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    if (flowSocket === "cancel") {
      this.outValues.lastDelay = { value: [null], type: this.getTypeIndex("ref") };
      for (const delayIndex of this._runningDelayIndices) {
        this.graphEngine.cancelScheduledDelay(delayIndex);
      }
      this._runningDelayIndices = [];
      return;
    }
    this.graphEngine.clearValueEvaluationCache();
    const { duration } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    if (isNaN(duration) || !isFinite(duration) || duration < 0) {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    } else {
      const delayIndex = this.graphEngine.scheduledDelays.length;
      const delayId = setTimeout(() => {
        this.graphEngine.removeScheduledDelay(delayIndex);
        this.addEventToWorkQueue(this.flows.done);
      }, duration * 1e3);
      this.graphEngine.pushScheduledDelay(delayId);
      this._runningDelayIndices.push(delayIndex);
      this.outValues.lastDelay = { value: [`/extensions/KHR_interactivity/delays/${delayIndex}`], type: this.getTypeIndex("ref") };
      this.processFlow(this.flows.out);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/flow/CancelDelay.ts
var CancelDelay = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { delay: {} };
    this.name = "CancelDelay";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { delay } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const delayIndex = this.resolveRef(delay);
    this.graphEngine.cancelScheduledDelay(delayIndex);
    this.processFlow(this.flows.out);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/constants/NotANumber.ts
var NotANumber = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.name = "NanNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
    return { "value": { value: [NaN], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/special/Select.ts
var Select = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, condition: {} };
    this.name = "SelectNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, condition } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    const typeIndexCondition = this.values["condition"].type;
    const typeCondition = this.getType(typeIndexCondition);
    if (typeCondition !== "bool") {
      throw Error("condition has invalid type");
    }
    let val = JSON.parse(condition) ? a : b;
    if (typeA === "int" || typeA === "bool" || typeA === "float") {
      val = [val];
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/typeConversion/BoolToInt.ts
var BoolToInt = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "BoolToInt";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "bool") {
      throw Error("Invalid type");
    }
    const val = JSON.parse(a) | 0;
    return { "value": { value: [val], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/typeConversion/BoolToFloat.ts
var BoolToFloat = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "BoolToFloat";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "bool") {
      throw Error("Invalid type");
    }
    const val = +JSON.parse(a);
    return { "value": { value: [val], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/typeConversion/FloatToBool.ts
var FloatToBool = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "FloatToBool";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "float") {
      throw Error("Invalid type");
    }
    const val = !!a;
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/typeConversion/FloatToInt.ts
var FloatToInt = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "FloatToInt";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "float") {
      throw Error("Invalid type");
    }
    const val = a | 0;
    return { "value": { value: [val], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/typeConversion/IntToBool.ts
var IntToBool = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "IntToBool";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "int") {
      throw Error("Invalid type");
    }
    const val = !!a;
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/typeConversion/IntToFloat.ts
var IntToFloat = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "IntToFloat";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "int") {
      throw Error("Invalid type");
    }
    const val = a;
    return { "value": { value: [val], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/extract/Extract2.ts
var Extract2 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Extract2Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float2") {
      throw Error("invalid input type");
    }
    return {
      "0": { value: [a[0]], type: this.getTypeIndex("float") },
      "1": { value: [a[1]], type: this.getTypeIndex("float") }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/extract/Extract3.ts
var Extract3 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Extract3Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float3") {
      throw Error("invalid input type");
    }
    return {
      "0": { value: [a[0]], type: this.getTypeIndex("float") },
      "1": { value: [a[1]], type: this.getTypeIndex("float") },
      "2": { value: [a[2]], type: this.getTypeIndex("float") }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/extract/Extract4.ts
var Extract4 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Extract4Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float4") {
      throw Error("invalid input type");
    }
    return {
      "0": { value: [a[0]], type: this.getTypeIndex("float") },
      "1": { value: [a[1]], type: this.getTypeIndex("float") },
      "2": { value: [a[2]], type: this.getTypeIndex("float") },
      "3": { value: [a[3]], type: this.getTypeIndex("float") }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/extract/Extract2x2.ts
var Extract2x2 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Extract2x2Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float2x2") {
      throw Error("invalid input type");
    }
    return {
      "0": { value: [a[0]], type: this.getTypeIndex("float") },
      "1": { value: [a[1]], type: this.getTypeIndex("float") },
      "2": { value: [a[2]], type: this.getTypeIndex("float") },
      "3": { value: [a[3]], type: this.getTypeIndex("float") }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/extract/Extract3x3.ts
var Extract3x3 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Extract3x3Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float3x3") {
      throw Error("invalid input type");
    }
    return {
      "0": { value: [a[0]], type: this.getTypeIndex("float") },
      "1": { value: [a[1]], type: this.getTypeIndex("float") },
      "2": { value: [a[2]], type: this.getTypeIndex("float") },
      "3": { value: [a[3]], type: this.getTypeIndex("float") },
      "4": { value: [a[4]], type: this.getTypeIndex("float") },
      "5": { value: [a[5]], type: this.getTypeIndex("float") },
      "6": { value: [a[6]], type: this.getTypeIndex("float") },
      "7": { value: [a[7]], type: this.getTypeIndex("float") },
      "8": { value: [a[8]], type: this.getTypeIndex("float") }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/extract/Extract4x4.ts
var Extract4x4 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "Extract4x4Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float4x4") {
      throw Error("invalid input type");
    }
    return {
      "0": { value: [a[0]], type: this.getTypeIndex("float") },
      "1": { value: [a[1]], type: this.getTypeIndex("float") },
      "2": { value: [a[2]], type: this.getTypeIndex("float") },
      "3": { value: [a[3]], type: this.getTypeIndex("float") },
      "4": { value: [a[4]], type: this.getTypeIndex("float") },
      "5": { value: [a[5]], type: this.getTypeIndex("float") },
      "6": { value: [a[6]], type: this.getTypeIndex("float") },
      "7": { value: [a[7]], type: this.getTypeIndex("float") },
      "8": { value: [a[8]], type: this.getTypeIndex("float") },
      "9": { value: [a[9]], type: this.getTypeIndex("float") },
      "10": { value: [a[10]], type: this.getTypeIndex("float") },
      "11": { value: [a[11]], type: this.getTypeIndex("float") },
      "12": { value: [a[12]], type: this.getTypeIndex("float") },
      "13": { value: [a[13]], type: this.getTypeIndex("float") },
      "14": { value: [a[14]], type: this.getTypeIndex("float") },
      "15": { value: [a[15]], type: this.getTypeIndex("float") }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/combine/Combine2.ts
var Combine2 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "Combine2Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== "float" || typeB !== "float") {
      throw Error("invalid input types");
    }
    return { "value": { value: [a, b], type: this.getTypeIndex("float2") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/combine/Combine3.ts
var Combine3 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {} };
    this.name = "Combine3Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const typeIndexC = this.values["c"].type;
    const typeC = this.getType(typeIndexC);
    if (typeA !== "float" || typeB !== "float" || typeC !== "float") {
      throw Error("invalid input types");
    }
    return { "value": { value: [a, b, c], type: this.getTypeIndex("float3") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/combine/Combine4.ts
var Combine4 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {}, d: {} };
    this.name = "Combine4Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c, d } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const typeIndexC = this.values["c"].type;
    const typeC = this.getType(typeIndexC);
    const typeIndexD = this.values["d"].type;
    const typeD = this.getType(typeIndexD);
    if (typeA !== "float" || typeB !== "float" || typeC !== "float" || typeD !== "float") {
      throw Error("invalid input types");
    }
    return { "value": { value: [a, b, c, d], type: this.getTypeIndex("float4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/combine/Combine2x2.ts
var Combine2x2 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {}, d: {} };
    this.name = "Combine2x2Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c, d } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const characters = ["a", "b", "c", "d"];
    for (let i = 0; i < characters.length; i++) {
      const typeIndex = this.values[characters[i]].type;
      const typ = this.getType(typeIndex);
      if (typ !== "float") {
        throw Error(`invalid input type for ${characters[i]}`);
      }
    }
    return { "value": { value: [a, b, c, d], type: this.getTypeIndex("float2x2") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/combine/Combine3x3.ts
var Combine3x3 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {}, d: {}, e: {}, f: {}, g: {}, h: {}, i: {} };
    this.name = "Combine3x3Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c, d, e, f, g, h, i } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const characters = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    for (let i2 = 0; i2 < characters.length; i2++) {
      const typeIndex = this.values[characters[i2]].type;
      const typ = this.getType(typeIndex);
      if (typ !== "float") {
        throw Error(`invalid input type for ${characters[i2]}`);
      }
    }
    return { "value": { value: [a, b, c, d, e, f, g, h, i], type: this.getTypeIndex("float3x3") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/combine/Combine4x4.ts
var Combine4x4 = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {}, d: {}, e: {}, f: {}, g: {}, h: {}, i: {}, j: {}, k: {}, l: {}, m: {}, n: {}, o: {}, p: {} };
    this.name = "Combine4x4Node";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const characters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p"];
    for (let i2 = 0; i2 < characters.length; i2++) {
      const typeIndex = this.values[characters[i2]].type;
      const typ = this.getType(typeIndex);
      if (typ !== "float") {
        throw Error(`invalid input type for ${characters[i2]}`);
      }
    }
    return { "value": { value: [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p], type: this.getTypeIndex("float4x4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/pointer/PointerInterpolate.ts
var PointerInterpolate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { pointer: {}, type: {} };
    this.REQUIRED_VALUES = { value: {}, duration: {}, p1: {}, p2: {} };
    this.name = "PointerInterpolate";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { pointer, type } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._pointer = pointer[0];
    this._typeIndex = type[0];
    this._refs = this.parsePathRefVariables(this._pointer);
    this._indices = this.parsePathIndexVariables(this._pointer);
    if (this.isReadOnlyPointer(this._pointer, this._refs, this._indices)) {
      throw new Error(`Path ${this._pointer} is read only but is included in a pointer/interpolate configuration`);
    }
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const configVals = this.evaluateAllValues(this._refs);
    const configIndices = this.evaluateAllValues(this._indices);
    const requiredVals = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    const populatedPath = this.populatePath(this._pointer, configVals, configIndices);
    const { p1, p2 } = this.evaluateAllValues(["p1", "p2"]);
    const targetValue = requiredVals.value;
    const duration = requiredVals.duration;
    this.graphEngine.processNodeStarted(this);
    if (this.graphEngine.isValidJsonPtr(populatedPath)) {
      const valueType = this.graphEngine.getPathTypeName(populatedPath);
      const typeName = this.getType(this._typeIndex);
      if (valueType !== typeName) {
        if (this.flows.err) {
          this.processFlow(this.flows.err);
        }
        return;
      }
      if (!isValidInterpolationInput(duration, p1, p2)) {
        if (this.flows.err) {
          this.processFlow(this.flows.err);
        }
        return;
      }
      const initialValue = this.graphEngine.getPathValue(populatedPath);
      this.graphEngine.animateCubicBezier(populatedPath, p1, p2, initialValue, targetValue, duration, valueType, () => {
        if (this.flows.done) {
          this.addEventToWorkQueue(this.flows.done);
        }
      });
      if (this.flows.out) {
        this.processFlow(this.flows.out);
      }
    } else {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    }
  }
};
function isValidInterpolationInput(duration, p1, p2) {
  const durationValue = Number(duration);
  if (Number.isNaN(durationValue) || !Number.isFinite(durationValue) || durationValue < 0) {
    return false;
  }
  return [p1, p2].every((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      return false;
    }
    const x = Number(point[0]);
    const y = Number(point[1]);
    return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1;
  });
}

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatMul.ts
import * as glMatrix from "gl-matrix";
var QuatMul = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "QuatMulNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== "float4") {
      throw Error(`a should be of type float4, got ${typeA}`);
    }
    if (typeB !== "float4") {
      throw Error(`b should be of type float4, got ${typeB}`);
    }
    const quatA = glMatrix.quat.create();
    glMatrix.quat.set(quatA, a[0], a[1], a[2], a[3]);
    const quatB = glMatrix.quat.create();
    glMatrix.quat.set(quatB, b[0], b[1], b[2], b[3]);
    const result = glMatrix.quat.create();
    glMatrix.quat.mul(result, quatA, quatB);
    const val = [result[0], result[1], result[2], result[3]];
    return { "value": { value: val, type: this.getTypeIndex("float4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatConjugate.ts
var QuatConjugate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "QuatConjugateNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    if (type !== "float4") {
      throw Error(`a should be of type float4, got ${type}`);
    }
    const val = [-a[0], -a[1], -a[2], a[3]];
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatFromAxisAngle.ts
var QuatFromAxisAngle = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { axis: {}, angle: {} };
    this.name = "QuatFromAxisAngleNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { axis, angle } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexAxis = this.values["axis"].type;
    const typeAxis = this.getType(typeIndexAxis);
    const typeIndexAngle = this.values["angle"].type;
    const typeAngle = this.getType(typeIndexAngle);
    if (typeAxis !== "float3") {
      throw Error(`axis should be of type float3, got ${typeAxis}`);
    }
    if (typeAngle !== "float") {
      throw Error(`angle should be of type float, got ${typeAngle}`);
    }
    const x = axis[0] * Math.sin(Number(angle) / 2);
    const y = axis[1] * Math.sin(Number(angle) / 2);
    const z = axis[2] * Math.sin(Number(angle) / 2);
    const w = Math.cos(Number(angle) / 2);
    const val = [x, y, z, w];
    return { "value": { value: val, type: this.getTypeIndex("float4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatToAxisAngle.ts
var QuatToAxisAngle = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "QuatToAxisAngleNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float4") {
      throw Error(`a should be of type float4, got ${typeA}`);
    }
    if (this.isCloseTo(a[3], 0)) {
      return { "axis": { value: [1, 0, 0], type: this.getTypeIndex("float3") }, "angle": { value: [0], type: this.getTypeIndex("float") } };
    }
    const axisX = a[0] / Math.sqrt(1 - a[3] * a[3]);
    const axisY = a[1] / Math.sqrt(1 - a[3] * a[3]);
    const axisZ = a[2] / Math.sqrt(1 - a[3] * a[3]);
    const angle = 2 * Math.acos(a[3]);
    return { "axis": { value: [axisX, axisY, axisZ], type: this.getTypeIndex("float3") }, "angle": { value: [angle], type: this.getTypeIndex("float") } };
  }
  isCloseTo(a, b, epsilon = 1e-6) {
    return Math.abs(a - b) < epsilon;
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatFromAngles.ts
var QuatFromAngles = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { order: { defaultValue: ["yxz"] } };
    this.REQUIRED_VALUES = { x: {}, y: {}, z: {} };
    this.name = "QuatFromAnglesNode";
    this.validateValues(this.values);
  }
  multiplyQuaternions(q1, q2) {
    const [x1, y1, z1, w1] = q1;
    const [x2, y2, z2, w2] = q2;
    return [
      x1 * w2 + w1 * x2 + y1 * z2 - z1 * y2,
      y1 * w2 + w1 * y2 + z1 * x2 - x1 * z2,
      z1 * w2 + w1 * z2 + x1 * y2 - y1 * x2,
      w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
    ];
  }
  processNode(flowSocket) {
    const { x, y, z } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexAngleX = this.values["x"].type;
    const typeAngleX = this.getType(typeIndexAngleX);
    const typeIndexAngleY = this.values["y"].type;
    const typeAngleY = this.getType(typeIndexAngleY);
    const typeIndexAngleZ = this.values["z"].type;
    const typeAngleZ = this.getType(typeIndexAngleZ);
    if (typeAngleX !== "float" || typeAngleY !== "float" || typeAngleZ !== "float") {
      throw Error(`Angles must be of type float.`);
    }
    const order = this.configuration?.order?.value?.[0] || "yxz";
    const cx = Math.cos(Number(x) / 2);
    const sx = Math.sin(Number(x) / 2);
    const cy = Math.cos(Number(y) / 2);
    const sy = Math.sin(Number(y) / 2);
    const cz = Math.cos(Number(z) / 2);
    const sz = Math.sin(Number(z) / 2);
    const qX = [sx, 0, 0, cx];
    const qY = [0, sy, 0, cy];
    const qZ = [0, 0, sz, cz];
    const quatMap = { x: qX, y: qY, z: qZ };
    if (!quatMap[order[0]] || !quatMap[order[1]] || !quatMap[order[2]]) {
      throw Error(`Invalid rotation order: ${order}. Must contain x, y, and z.`);
    }
    const qFirst = quatMap[order[0]];
    const qSecond = quatMap[order[1]];
    const qThird = quatMap[order[2]];
    const tempQuat = this.multiplyQuaternions(qFirst, qSecond);
    const finalQuat = this.multiplyQuaternions(tempQuat, qThird);
    return { "value": { value: finalQuat, type: this.getTypeIndex("float4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatFromDirections.ts
var QuatFromDirections = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "QuatFromDirectionsNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== "float3") {
      throw Error(`a should be of type float3, got ${typeA}`);
    }
    if (typeB !== "float3") {
      throw Error(`b should be of type float3, got ${typeB}`);
    }
    const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (this.isCloseTo(c, 1)) {
      return { "value": { value: [0, 0, 0, 1], type: this.getTypeIndex("float4") } };
    }
    if (this.isCloseTo(c, -1)) {
      let perpendicular;
      if (Math.abs(a[0]) < Math.abs(a[1])) {
        perpendicular = [0, -a[2], a[1]];
      } else {
        perpendicular = [-a[2], 0, a[0]];
      }
      const length = Math.sqrt(perpendicular[0] * perpendicular[0] + perpendicular[1] * perpendicular[1] + perpendicular[2] * perpendicular[2]);
      const x2 = perpendicular[0] / length;
      const y2 = perpendicular[1] / length;
      const z2 = perpendicular[2] / length;
      const w2 = 0;
      return { "value": { value: [x2, y2, z2, w2], type: this.getTypeIndex("float4") } };
    }
    const aCrossB = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const aCrossBLength = Math.sqrt(aCrossB[0] * aCrossB[0] + aCrossB[1] * aCrossB[1] + aCrossB[2] * aCrossB[2]);
    const aCrossBNormalized = [aCrossB[0] / aCrossBLength, aCrossB[1] / aCrossBLength, aCrossB[2] / aCrossBLength];
    const x = aCrossBNormalized[0] * Math.sqrt(0.5 - 0.5 * c);
    const y = aCrossBNormalized[1] * Math.sqrt(0.5 - 0.5 * c);
    const z = aCrossBNormalized[2] * Math.sqrt(0.5 - 0.5 * c);
    const w = Math.sqrt(0.5 + 0.5 * c);
    return { "value": { value: [x, y, z, w], type: this.getTypeIndex("float4") } };
  }
  isCloseTo(a, b, epsilon = 1e-6) {
    return Math.abs(a - b) < epsilon;
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/Not.ts
var Not = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "NotNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    let val;
    switch (typeA) {
      case "bool":
        val = !JSON.parse(a);
        break;
      case "int":
        val = ~a;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/Xor.ts
var Xor = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "XorNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "bool":
        val = JSON.parse(a) !== JSON.parse(b);
        break;
      case "int":
        val = a ^ b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/Or.ts
var Or = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "OrNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "bool":
        val = JSON.parse(a) || JSON.parse(b);
        break;
      case "int":
        val = a | b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/And.ts
var And = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "AndNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "bool":
        val = JSON.parse(a) && JSON.parse(b);
        break;
      case "int":
        val = a & b;
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: [val], type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/LeftShift.ts
var LeftShift = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "LeftShiftNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== "int" || typeB !== "int") {
      throw Error("invalid input type");
    }
    const val = a << b;
    return { "value": { value: [val], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/RightShift.ts
var RightShift = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "RightShiftNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== "int" || typeB !== "int") {
      throw Error("invalid input type");
    }
    const val = a >> b;
    return { "value": { value: [val], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/CountLeadingZeros.ts
var CountLeadingZeros = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "CountLeadingZerosNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "int") {
      throw Error("invalid input type");
    }
    const val = Math.clz32(a);
    return { "value": { value: [val], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/CountOneBits.ts
var CountOneBits = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "CountOneBitsNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "int") {
      throw Error("invalid input type");
    }
    let count = 0;
    let tempNumber = a;
    while (tempNumber !== 0) {
      tempNumber = tempNumber & tempNumber - 1;
      count++;
    }
    return { "value": { value: [count], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/bitwise/CountTrailingZeros.ts
var CountTrailingZeros = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "CountTrailingZerosNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "int") {
      throw Error("invalid input type");
    }
    const val = a ? 31 - Math.clz32(a & -a) : 32;
    return { "value": { value: [val], type: this.getTypeIndex("int") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/Fraction.ts
var Fraction = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "FractionNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [a - Math.floor(a)];
        break;
      case "float2":
        val = [
          a[0] - Math.floor(a[0]),
          a[1] - Math.floor(a[1])
        ];
        break;
      case "float3":
        val = [
          a[0] - Math.floor(a[0]),
          a[1] - Math.floor(a[1]),
          a[2] - Math.floor(a[2])
        ];
        break;
      case "float4":
        val = [
          a[0] - Math.floor(a[0]),
          a[1] - Math.floor(a[1]),
          a[2] - Math.floor(a[2]),
          a[3] - Math.floor(a[3])
        ];
        break;
      case "float2x2":
        val = [
          a[0] - Math.floor(a[0]),
          a[1] - Math.floor(a[1]),
          a[2] - Math.floor(a[2]),
          a[3] - Math.floor(a[3])
        ];
        break;
      case "float3x3":
        val = [
          a[0] - Math.floor(a[0]),
          a[1] - Math.floor(a[1]),
          a[2] - Math.floor(a[2]),
          a[3] - Math.floor(a[3]),
          a[4] - Math.floor(a[4]),
          a[5] - Math.floor(a[5]),
          a[6] - Math.floor(a[6]),
          a[7] - Math.floor(a[7]),
          a[8] - Math.floor(a[8])
        ];
        break;
      case "float4x4":
        val = [
          a[0] - Math.floor(a[0]),
          a[1] - Math.floor(a[1]),
          a[2] - Math.floor(a[2]),
          a[3] - Math.floor(a[3]),
          a[4] - Math.floor(a[4]),
          a[5] - Math.floor(a[5]),
          a[6] - Math.floor(a[6]),
          a[7] - Math.floor(a[7]),
          a[8] - Math.floor(a[8]),
          a[9] - Math.floor(a[9]),
          a[10] - Math.floor(a[10]),
          a[11] - Math.floor(a[11]),
          a[12] - Math.floor(a[12]),
          a[13] - Math.floor(a[13]),
          a[14] - Math.floor(a[14]),
          a[15] - Math.floor(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/hyperbolic/HyperbolicSine.ts
var HyperbolicSine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "HyperbolicSineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.sinh(a)];
        break;
      case "float2":
        val = [
          Math.sinh(a[0]),
          Math.sinh(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.sinh(a[0]),
          Math.sinh(a[1]),
          Math.sinh(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.sinh(a[0]),
          Math.sinh(a[1]),
          Math.sinh(a[2]),
          Math.sinh(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.sinh(a[0]),
          Math.sinh(a[1]),
          Math.sinh(a[2]),
          Math.sinh(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.sinh(a[0]),
          Math.sinh(a[1]),
          Math.sinh(a[2]),
          Math.sinh(a[3]),
          Math.sinh(a[4]),
          Math.sinh(a[5]),
          Math.sinh(a[6]),
          Math.sinh(a[7]),
          Math.sinh(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.sinh(a[0]),
          Math.sinh(a[1]),
          Math.sinh(a[2]),
          Math.sinh(a[3]),
          Math.sinh(a[4]),
          Math.sinh(a[5]),
          Math.sinh(a[6]),
          Math.sinh(a[7]),
          Math.sinh(a[8]),
          Math.sinh(a[9]),
          Math.sinh(a[10]),
          Math.sinh(a[11]),
          Math.sinh(a[12]),
          Math.sinh(a[13]),
          Math.sinh(a[14]),
          Math.sinh(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/hyperbolic/InverseHyperbolicSine.ts
var InverseHyperbolicSine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "InverseHyperbolicSineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.asinh(a)];
        break;
      case "float2":
        val = [
          Math.asinh(a[0]),
          Math.asinh(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.asinh(a[0]),
          Math.asinh(a[1]),
          Math.asinh(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.asinh(a[0]),
          Math.asinh(a[1]),
          Math.asinh(a[2]),
          Math.asinh(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.asinh(a[0]),
          Math.asinh(a[1]),
          Math.asinh(a[2]),
          Math.asinh(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.asinh(a[0]),
          Math.asinh(a[1]),
          Math.asinh(a[2]),
          Math.asinh(a[3]),
          Math.asinh(a[4]),
          Math.asinh(a[5]),
          Math.asinh(a[6]),
          Math.asinh(a[7]),
          Math.asinh(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.asinh(a[0]),
          Math.asinh(a[1]),
          Math.asinh(a[2]),
          Math.asinh(a[3]),
          Math.asinh(a[4]),
          Math.asinh(a[5]),
          Math.asinh(a[6]),
          Math.asinh(a[7]),
          Math.asinh(a[8]),
          Math.asinh(a[9]),
          Math.asinh(a[10]),
          Math.asinh(a[11]),
          Math.asinh(a[12]),
          Math.asinh(a[13]),
          Math.asinh(a[14]),
          Math.asinh(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/hyperbolic/InverseHyperbolicCosine.ts
var InverseHyperbolicCosine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "InverseHyperbolicCosineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.acosh(a)];
        break;
      case "float2":
        val = [
          Math.acosh(a[0]),
          Math.acosh(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.acosh(a[0]),
          Math.acosh(a[1]),
          Math.acosh(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.acosh(a[0]),
          Math.acosh(a[1]),
          Math.acosh(a[2]),
          Math.acosh(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.acosh(a[0]),
          Math.acosh(a[1]),
          Math.acosh(a[2]),
          Math.acosh(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.acosh(a[0]),
          Math.acosh(a[1]),
          Math.acosh(a[2]),
          Math.acosh(a[3]),
          Math.acosh(a[4]),
          Math.acosh(a[5]),
          Math.acosh(a[6]),
          Math.acosh(a[7]),
          Math.acosh(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.acosh(a[0]),
          Math.acosh(a[1]),
          Math.acosh(a[2]),
          Math.acosh(a[3]),
          Math.acosh(a[4]),
          Math.acosh(a[5]),
          Math.acosh(a[6]),
          Math.acosh(a[7]),
          Math.acosh(a[8]),
          Math.acosh(a[9]),
          Math.acosh(a[10]),
          Math.acosh(a[11]),
          Math.acosh(a[12]),
          Math.acosh(a[13]),
          Math.acosh(a[14]),
          Math.acosh(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/hyperbolic/InverseHyperbolicTangent.ts
var InverseHyperbolicTangent = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "InverseHyperbolicTangentNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.atanh(a)];
        break;
      case "float2":
        val = [
          Math.atanh(a[0]),
          Math.atanh(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.atanh(a[0]),
          Math.atanh(a[1]),
          Math.atanh(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.atanh(a[0]),
          Math.atanh(a[1]),
          Math.atanh(a[2]),
          Math.atanh(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.atanh(a[0]),
          Math.atanh(a[1]),
          Math.atanh(a[2]),
          Math.atanh(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.atanh(a[0]),
          Math.atanh(a[1]),
          Math.atanh(a[2]),
          Math.atanh(a[3]),
          Math.atanh(a[4]),
          Math.atanh(a[5]),
          Math.atanh(a[6]),
          Math.atanh(a[7]),
          Math.atanh(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.atanh(a[0]),
          Math.atanh(a[1]),
          Math.atanh(a[2]),
          Math.atanh(a[3]),
          Math.atanh(a[4]),
          Math.atanh(a[5]),
          Math.atanh(a[6]),
          Math.atanh(a[7]),
          Math.atanh(a[8]),
          Math.atanh(a[9]),
          Math.atanh(a[10]),
          Math.atanh(a[11]),
          Math.atanh(a[12]),
          Math.atanh(a[13]),
          Math.atanh(a[14]),
          Math.atanh(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/exponential/Exponential.ts
var Exponential = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "ExponentialNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    let val;
    switch (typeA) {
      case "float":
        val = [Math.exp(a)];
        break;
      case "float2":
        val = [
          Math.exp(a[0]),
          Math.exp(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.exp(a[0]),
          Math.exp(a[1]),
          Math.exp(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.exp(a[0]),
          Math.exp(a[1]),
          Math.exp(a[2]),
          Math.exp(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.exp(a[0]),
          Math.exp(a[1]),
          Math.exp(a[2]),
          Math.exp(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.exp(a[0]),
          Math.exp(a[1]),
          Math.exp(a[2]),
          Math.exp(a[3]),
          Math.exp(a[4]),
          Math.exp(a[5]),
          Math.exp(a[6]),
          Math.exp(a[7]),
          Math.exp(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.exp(a[0]),
          Math.exp(a[1]),
          Math.exp(a[2]),
          Math.exp(a[3]),
          Math.exp(a[4]),
          Math.exp(a[5]),
          Math.exp(a[6]),
          Math.exp(a[7]),
          Math.exp(a[8]),
          Math.exp(a[9]),
          Math.exp(a[10]),
          Math.exp(a[11]),
          Math.exp(a[12]),
          Math.exp(a[13]),
          Math.exp(a[14]),
          Math.exp(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/hyperbolic/HyperbolicCosine.ts
var HyperbolicCosine = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "HyperbolicCosineNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.cosh(a)];
        break;
      case "float2":
        val = [
          Math.cosh(a[0]),
          Math.cosh(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.cosh(a[0]),
          Math.cosh(a[1]),
          Math.cosh(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.cosh(a[0]),
          Math.cosh(a[1]),
          Math.cosh(a[2]),
          Math.cosh(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.cosh(a[0]),
          Math.cosh(a[1]),
          Math.cosh(a[2]),
          Math.cosh(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.cosh(a[0]),
          Math.cosh(a[1]),
          Math.cosh(a[2]),
          Math.cosh(a[3]),
          Math.cosh(a[4]),
          Math.cosh(a[5]),
          Math.cosh(a[6]),
          Math.cosh(a[7]),
          Math.cosh(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.cosh(a[0]),
          Math.cosh(a[1]),
          Math.cosh(a[2]),
          Math.cosh(a[3]),
          Math.cosh(a[4]),
          Math.cosh(a[5]),
          Math.cosh(a[6]),
          Math.cosh(a[7]),
          Math.cosh(a[8]),
          Math.cosh(a[9]),
          Math.cosh(a[10]),
          Math.cosh(a[11]),
          Math.cosh(a[12]),
          Math.cosh(a[13]),
          Math.cosh(a[14]),
          Math.cosh(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/hyperbolic/HyperbolicTangent.ts
var HyperbolicTangent = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "HyperbolicTangentNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let val;
    switch (type) {
      case "float":
        val = [Math.tanh(a)];
        break;
      case "float2":
        val = [
          Math.tanh(a[0]),
          Math.tanh(a[1])
        ];
        break;
      case "float3":
        val = [
          Math.tanh(a[0]),
          Math.tanh(a[1]),
          Math.tanh(a[2])
        ];
        break;
      case "float4":
        val = [
          Math.tanh(a[0]),
          Math.tanh(a[1]),
          Math.tanh(a[2]),
          Math.tanh(a[3])
        ];
        break;
      case "float2x2":
        val = [
          Math.tanh(a[0]),
          Math.tanh(a[1]),
          Math.tanh(a[2]),
          Math.tanh(a[3])
        ];
        break;
      case "float3x3":
        val = [
          Math.tanh(a[0]),
          Math.tanh(a[1]),
          Math.tanh(a[2]),
          Math.tanh(a[3]),
          Math.tanh(a[4]),
          Math.tanh(a[5]),
          Math.tanh(a[6]),
          Math.tanh(a[7]),
          Math.tanh(a[8])
        ];
        break;
      case "float4x4":
        val = [
          Math.tanh(a[0]),
          Math.tanh(a[1]),
          Math.tanh(a[2]),
          Math.tanh(a[3]),
          Math.tanh(a[4]),
          Math.tanh(a[5]),
          Math.tanh(a[6]),
          Math.tanh(a[7]),
          Math.tanh(a[8]),
          Math.tanh(a[9]),
          Math.tanh(a[10]),
          Math.tanh(a[11]),
          Math.tanh(a[12]),
          Math.tanh(a[13]),
          Math.tanh(a[14]),
          Math.tanh(a[15])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndex } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/easingUtils.ts
import * as glMatrix2 from "gl-matrix";
var easeFloat = (t, easingParameters) => {
  if (easingParameters.easingType === 0) {
    return cubicBezierFloat(t, easingParameters.initialValue, easingParameters.targetValue, easingParameters.cp1, easingParameters.cp2);
  } else if (easingParameters.easingType == 2) {
    return linearFloat(t, easingParameters.initialValue, easingParameters.targetValue);
  } else {
    return easingParameters.targetValue;
  }
};
var easeFloat3 = (t, easingParameters) => {
  if (easingParameters.easingType === 0) {
    return [
      cubicBezierFloat(t, easingParameters.initialValue[0], easingParameters.targetValue[0], easingParameters.cp1[0], easingParameters.cp2[0]),
      cubicBezierFloat(t, easingParameters.initialValue[1], easingParameters.targetValue[1], easingParameters.cp1[1], easingParameters.cp2[1]),
      cubicBezierFloat(t, easingParameters.initialValue[2], easingParameters.targetValue[2], easingParameters.cp1[2], easingParameters.cp2[2])
    ];
  } else if (easingParameters.easingType == 2) {
    return [
      linearFloat(t, easingParameters.initialValue[0], easingParameters.targetValue[0]),
      linearFloat(t, easingParameters.initialValue[1], easingParameters.targetValue[1]),
      linearFloat(t, easingParameters.initialValue[2], easingParameters.targetValue[2])
    ];
  } else {
    return [
      easingParameters.targetValue[0],
      easingParameters.targetValue[1],
      easingParameters.targetValue[2]
    ];
  }
};
var easeFloat4 = (t, easingParameters) => {
  if (easingParameters.easingType === 0) {
    return [
      cubicBezierFloat(t, easingParameters.initialValue[0], easingParameters.targetValue[0], easingParameters.cp1[0], easingParameters.cp2[0]),
      cubicBezierFloat(t, easingParameters.initialValue[1], easingParameters.targetValue[1], easingParameters.cp1[1], easingParameters.cp2[1]),
      cubicBezierFloat(t, easingParameters.initialValue[2], easingParameters.targetValue[2], easingParameters.cp1[2], easingParameters.cp2[2]),
      cubicBezierFloat(t, easingParameters.initialValue[3], easingParameters.targetValue[3], easingParameters.cp1[3], easingParameters.cp2[3])
    ];
  } else if (easingParameters.easingType === 1) {
    return slerpFloat4(t, easingParameters.initialValue, easingParameters.targetValue);
  } else if (easingParameters.easingType == 2) {
    return [
      linearFloat(t, easingParameters.initialValue[0], easingParameters.targetValue[0]),
      linearFloat(t, easingParameters.initialValue[1], easingParameters.targetValue[1]),
      linearFloat(t, easingParameters.initialValue[2], easingParameters.targetValue[2]),
      linearFloat(t, easingParameters.initialValue[2], easingParameters.targetValue[3])
    ];
  } else {
    return [
      easingParameters.targetValue[0],
      easingParameters.targetValue[1],
      easingParameters.targetValue[2],
      easingParameters.targetValue[3]
    ];
  }
};
var slerpFloat4 = (t, initialVal, targetVal) => {
  const q1 = glMatrix2.quat.fromValues(initialVal[1], initialVal[2], initialVal[3], initialVal[0]);
  const q2 = glMatrix2.quat.fromValues(targetVal[1], targetVal[2], targetVal[3], targetVal[0]);
  const outQuat = glMatrix2.quat.create();
  glMatrix2.quat.slerp(outQuat, q1, q2, t);
  return [outQuat[3], outQuat[0], outQuat[1], outQuat[2]];
};
var cubicBezierFloat = (t, initialVal, targetVal, cp1, cp2) => {
  return Math.pow(1 - t, 3) * initialVal + 3 * Math.pow(1 - t, 2) * t * cp1 + 3 * (1 - t) * Math.pow(t, 2) * cp2 + Math.pow(t, 3) * targetVal;
};
var linearFloat = (t, initialVal, targetVal) => {
  return initialVal + (targetVal - initialVal) * t;
};
var cubicBezierEase = (x, p1, p2) => {
  const cx = 3 * p1[0];
  const bx = 3 * (p2[0] - p1[0]) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1[1];
  const by = 3 * (p2[1] - p1[1]) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s2) => ((ax * s2 + bx) * s2 + cx) * s2;
  const sampleY = (s2) => ((ay * s2 + by) * s2 + cy) * s2;
  const sampleDerivativeX = (s2) => (3 * ax * s2 + 2 * bx) * s2 + cx;
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  let s = x;
  for (let i = 0; i < 8; i++) {
    const error = sampleX(s) - x;
    if (Math.abs(error) < 1e-7) {
      return sampleY(s);
    }
    const derivative = sampleDerivativeX(s);
    if (Math.abs(derivative) < 1e-7) {
      break;
    }
    s -= error / derivative;
  }
  let low = 0;
  let high = 1;
  s = x;
  while (low < high) {
    const sampled = sampleX(s);
    if (Math.abs(sampled - x) < 1e-7) {
      break;
    }
    if (sampled < x) {
      low = s;
    } else {
      high = s;
    }
    const next = (high + low) / 2;
    if (next === s) {
      break;
    }
    s = next;
  }
  return sampleY(s);
};
var cubicBezier = (t, P0, P1, P2, P3) => {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  const p = { x: 0, y: 0 };
  p.x = uuu * P0.x + 3 * uu * t * P1.x + 3 * u * tt * P2.x + ttt * P3.x;
  p.y = uuu * P0.y + 3 * uu * t * P1.y + 3 * u * tt * P2.y + ttt * P3.y;
  return p;
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/variable/VariableInterpolate.ts
var VariableInterpolate = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { variable: {}, useSlerp: {} };
    this.REQUIRED_VALUES = { value: {}, duration: {}, p1: {}, p2: {} };
    this.name = "VariableInterpolate";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { variable, useSlerp } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._variable = variable[0];
    this._useSlerp = useSlerp[0];
    this._valueType = this.getType(this.variables[this._variable].type);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { value, duration, p1, p2 } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    if (isNaN(duration) || !isFinite(duration) || isNaN(p1[0]) || !isFinite(p1[0]) || isNaN(p1[1]) || !isFinite(p1[1]) || isNaN(p2[0]) || !isFinite(p2[0]) || isNaN(p2[1]) || !isFinite(p2[1]) || duration < 0 || p1[0] < 0 || p1[0] > 1 || p2[0] < 0 || p2[0] > 1) {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
      return;
    }
    this.graphEngine.clearVariableInterpolation(this._variable);
    const callback = () => {
      this.graphEngine.clearVariableInterpolation(this._variable);
      if (this.flows.done) {
        this.addEventToWorkQueue(this.flows.done);
      }
    };
    const initialValue = this.variables[this._variable].value[0];
    const targetValue = value;
    const startTime = this.graphEngine.lastTickTime;
    const interpolationAction = () => {
      const elapsedDuration = (this.graphEngine.lastTickTime - startTime) / 1e3;
      const t = Math.min(elapsedDuration / duration, 1);
      const q = cubicBezierEase(t, p1, p2);
      if (this._valueType === "float3") {
        const value2 = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1]), linearFloat(q, initialValue[2], targetValue[2])];
        this.variables[this._variable].value = value2;
      } else if (this._valueType === "float4") {
        if (this._useSlerp) {
          const value2 = slerpFloat4(q, initialValue, targetValue);
          this.variables[this._variable].value = value2;
        } else {
          const value2 = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1]), linearFloat(q, initialValue[2], targetValue[2]), linearFloat(q, initialValue[3], targetValue[3])];
          this.variables[this._variable].value = value2;
        }
      } else if (this._valueType === "float") {
        const value2 = [linearFloat(q, initialValue, targetValue)];
        this.variables[this._variable].value = [value2];
      } else if (this._valueType == "float2") {
        const value2 = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1])];
        this.variables[this._variable].value = value2;
      }
      if (elapsedDuration >= duration) {
        this.variables[this._variable].value = [targetValue];
        this.graphEngine.clearVariableInterpolation(this._variable);
        callback();
      }
    };
    this.graphEngine.setVariableInterpolationCallback(this._variable, { action: interpolationAction });
    if (this.flows.out) {
      this.processFlow(this.flows.out);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/experimental/NoOp.ts
var NoOpNode = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    registerNoOpNode(this);
    this.name = `NoOp (unsupported op "${this.declaration.op}")`;
    const outValues = {};
    Object.entries(this.declaration.outputValueSockets || {}).forEach(([key, value]) => {
      const typeName = this.getType(value.type);
      const defaultValue = this.getDefaultValueForType(typeName);
      outValues[key] = { value: defaultValue, type: value.type };
    });
    this.outValues = outValues;
  }
  processNode(flowSocket) {
    this.graphEngine.processNodeStarted(this);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/matDecompose.ts
import * as glMatrix3 from "gl-matrix";

// vendor/khronos-interactivity/BasicBehaveEngine/matrixUtils.ts
var flattenMatrix = (matrix) => {
  return matrix.flat();
};
var unflattenMatrix = (flatMatrix, dimension) => {
  return flatMatrix.reduce((acc, val, index) => {
    const row = Math.floor(index / dimension);
    const col = index % dimension;
    if (!acc[row]) {
      acc[row] = [];
    }
    acc[row][col] = val;
    return acc;
  }, []);
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/matDecompose.ts
var MatDecompose = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "MatDecompose";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const validTypePairings = typeA === "float4x4";
    if (!validTypePairings) {
      throw Error("Invalid type for a");
    }
    const result = {
      "translation": { value: [0, 0, 0], type: this.getTypeIndex("float3") },
      "rotation": { value: [0, 0, 0, 1], type: this.getTypeIndex("float4") },
      "scale": { value: [1, 1, 1], type: this.getTypeIndex("float3") }
    };
    const unflattenedA = unflattenMatrix(a, 4);
    result.translation.value = [unflattenedA[3][0], unflattenedA[3][1], unflattenedA[3][2]];
    const s_x = Math.sqrt(unflattenedA[0][0] * unflattenedA[0][0] + unflattenedA[0][1] * unflattenedA[0][1] + unflattenedA[0][2] * unflattenedA[0][2]);
    const s_y = Math.sqrt(unflattenedA[1][0] * unflattenedA[1][0] + unflattenedA[1][1] * unflattenedA[1][1] + unflattenedA[1][2] * unflattenedA[1][2]);
    const s_z = Math.sqrt(unflattenedA[2][0] * unflattenedA[2][0] + unflattenedA[2][1] * unflattenedA[2][1] + unflattenedA[2][2] * unflattenedA[2][2]);
    if (isNaN(s_x) || isNaN(s_y) || isNaN(s_z) || !isFinite(s_x) || !isFinite(s_y) || !isFinite(s_z) || s_x === 0 || s_y === 0 || s_z === 0) {
      result.scale.value = [s_x, s_y, s_z];
      return result;
    }
    const B = [
      [unflattenedA[0][0] / s_x, unflattenedA[0][1] / s_x, unflattenedA[0][2] / s_x],
      [unflattenedA[1][0] / s_y, unflattenedA[1][1] / s_y, unflattenedA[1][2] / s_y],
      [unflattenedA[2][0] / s_z, unflattenedA[2][1] / s_z, unflattenedA[2][2] / s_z]
    ];
    const detB = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) - B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) + B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
    if (detB > 0) {
      result.scale.value = [s_x, s_y, s_z];
    } else {
      result.scale.value = [-s_x, -s_y, -s_z];
      B[0][0] = -B[0][0];
      B[0][1] = -B[0][1];
      B[0][2] = -B[0][2];
      B[1][0] = -B[1][0];
      B[1][1] = -B[1][1];
      B[1][2] = -B[1][2];
      B[2][0] = -B[2][0];
      B[2][1] = -B[2][1];
      B[2][2] = -B[2][2];
    }
    const B_matrix = glMatrix3.mat3.fromValues(B[0][0], B[0][1], B[0][2], B[1][0], B[1][1], B[1][2], B[2][0], B[2][1], B[2][2]);
    const rotation = glMatrix3.quat.create();
    glMatrix3.quat.fromMat3(rotation, B_matrix);
    result.rotation.value = [rotation[0], rotation[1], rotation[2], rotation[3]];
    return result;
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/matCompose.ts
import * as glMatrix4 from "gl-matrix";
var MatCompose = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { translation: {}, rotation: {}, scale: {} };
    this.name = "MatCompose";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { translation, rotation, scale } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexTranslation = this.values["translation"].type;
    const typeTranslation = this.getType(typeIndexTranslation);
    const typeIndexRotation = this.values["rotation"].type;
    const typeRotation = this.getType(typeIndexRotation);
    const typeIndexScale = this.values["scale"].type;
    const typeScale = this.getType(typeIndexScale);
    const validTypePairings = typeTranslation === "float3" && typeRotation === "float4" && typeScale === "float3";
    if (!validTypePairings) {
      throw Error("Invalid type pairings");
    }
    const rotationMatrix = new Float32Array(16);
    const scaleMatrix = new Float32Array(16);
    const resultMatrix = new Float32Array(16);
    glMatrix4.mat4.fromQuat(rotationMatrix, rotation);
    glMatrix4.mat4.fromScaling(scaleMatrix, scale);
    glMatrix4.mat4.multiply(resultMatrix, rotationMatrix, scaleMatrix);
    resultMatrix[12] = translation[0];
    resultMatrix[13] = translation[1];
    resultMatrix[14] = translation[2];
    const val = [
      resultMatrix[0],
      resultMatrix[1],
      resultMatrix[2],
      resultMatrix[3],
      resultMatrix[4],
      resultMatrix[5],
      resultMatrix[6],
      resultMatrix[7],
      resultMatrix[8],
      resultMatrix[9],
      resultMatrix[10],
      resultMatrix[11],
      resultMatrix[12],
      resultMatrix[13],
      resultMatrix[14],
      resultMatrix[15]
    ];
    return { "value": { value: val, type: this.getTypeIndex("float4x4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/MatMul.ts
import * as glMatrix5 from "gl-matrix";
var MatMul = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "MatMul";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const validTypePairings = typeA === "float4x4" && typeB === "float4x4" || typeA === "float3x3" && typeB === "float3x3" || typeA === "float2x2" && typeB === "float2x2";
    if (!validTypePairings) {
      throw Error("Invalid type pairings");
    }
    if (typeA === "float4x4") {
      const matA = new Float32Array([
        a[0],
        a[1],
        a[2],
        a[3],
        a[4],
        a[5],
        a[6],
        a[7],
        a[8],
        a[9],
        a[10],
        a[11],
        a[12],
        a[13],
        a[14],
        a[15]
      ]);
      const matB = new Float32Array([
        b[0],
        b[1],
        b[2],
        b[3],
        b[4],
        b[5],
        b[6],
        b[7],
        b[8],
        b[9],
        b[10],
        b[11],
        b[12],
        b[13],
        b[14],
        b[15]
      ]);
      const result = glMatrix5.mat4.create();
      glMatrix5.mat4.multiply(result, matA, matB);
      return { "value": { value: [
        result[0],
        result[1],
        result[2],
        result[3],
        result[4],
        result[5],
        result[6],
        result[7],
        result[8],
        result[9],
        result[10],
        result[11],
        result[12],
        result[13],
        result[14],
        result[15]
      ], type: typeIndexA } };
    } else if (typeA === "float3x3") {
      const matA = new Float32Array([
        a[0],
        a[1],
        a[2],
        a[3],
        a[4],
        a[5],
        a[6],
        a[7],
        a[8]
      ]);
      const matB = new Float32Array([
        b[0],
        b[1],
        b[2],
        b[3],
        b[4],
        b[5],
        b[6],
        b[7],
        b[8]
      ]);
      const result = glMatrix5.mat3.create();
      glMatrix5.mat3.multiply(result, matA, matB);
      return { "value": { value: [
        result[0],
        result[1],
        result[2],
        result[3],
        result[4],
        result[5],
        result[6],
        result[7],
        result[8]
      ], type: typeIndexA } };
    } else if (typeA === "float2x2") {
      const matA = new Float32Array([
        a[0],
        a[1],
        a[2],
        a[3]
      ]);
      const matB = new Float32Array([
        b[0],
        b[1],
        b[2],
        b[3]
      ]);
      const result = glMatrix5.mat2.create();
      glMatrix5.mat2.multiply(result, matA, matB);
      return { "value": { value: [
        result[0],
        result[1],
        result[2],
        result[3]
      ], type: typeIndexA } };
    } else {
      throw Error(`Invalid type ${typeA}`);
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/special/MathSwitch.ts
var MathSwitch = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { cases: { defaultValue: [] } };
    this.REQUIRED_VALUES = { default: {}, selection: {} };
    this.name = "MathSwitchNode";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { cases } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._cases = cases;
  }
  processNode(flowSocket) {
    const evaluatedValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    const defaultSelection = evaluatedValues.default;
    const selection = evaluatedValues.selection;
    this.graphEngine.processNodeStarted(this);
    const caseVals = this.evaluateAllValues(this._cases.map((v) => `${v}`));
    for (const [key, caseVal] of Object.entries(caseVals)) {
      if (caseVal === void 0) {
        throw Error(`case value ${key} is undefined`);
      }
    }
    const typeIndexSelection = this.values["selection"].type;
    const typeSelection = this.getType(typeIndexSelection);
    const typeIndexDefault = this.values["default"].type;
    const typeDefault = this.getType(typeIndexDefault);
    if (typeSelection !== "int") {
      throw Error("selection has invalid type expected int");
    }
    for (const [key, caseVal] of Object.entries(caseVals)) {
      const typeIndexCase = this.values[key].type;
      const typeCase = this.getType(typeIndexCase);
      if (typeCase !== typeDefault) {
        throw Error(`case value ${key} has invalid type, expected ${typeDefault}`);
      }
    }
    const selectionIndex = Number(selection);
    const val = caseVals[`${selectionIndex}`];
    if (val === void 0) {
      const returnVal2 = Array.isArray(defaultSelection) ? defaultSelection : [defaultSelection];
      return {
        "value": { value: returnVal2, type: typeIndexDefault }
      };
    }
    const returnVal = Array.isArray(val) ? val : [val];
    return {
      "value": { value: returnVal, type: typeIndexDefault }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/Inverse.ts
import * as glMatrix6 from "gl-matrix";
var Inverse = class _Inverse extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "InverseNode";
    this.validateValues(this.values);
  }
  static createZeroMatrix(size) {
    return Array(size * size).fill(0);
  }
  static invert4x4(matrix) {
    const colMajor = new Float32Array(matrix);
    const determinant = glMatrix6.mat4.determinant(colMajor);
    if (!Number.isFinite(determinant) || determinant === 0) {
      return { value: this.createZeroMatrix(4), isValid: false };
    }
    const result = glMatrix6.mat4.create();
    const success = glMatrix6.mat4.invert(result, colMajor);
    if (!success) {
      return { value: this.createZeroMatrix(4), isValid: false };
    }
    return { value: Array.from(result), isValid: true };
  }
  static invert3x3(matrix) {
    const colMajor = new Float32Array(matrix);
    const determinant = glMatrix6.mat3.determinant(colMajor);
    if (!Number.isFinite(determinant) || determinant === 0) {
      return { value: this.createZeroMatrix(3), isValid: false };
    }
    const result = glMatrix6.mat3.create();
    const success = glMatrix6.mat3.invert(result, colMajor);
    if (!success) {
      return { value: this.createZeroMatrix(3), isValid: false };
    }
    return { value: Array.from(result), isValid: true };
  }
  static invert2x2(matrix) {
    const colMajor = new Float32Array(matrix);
    const determinant = glMatrix6.mat2.determinant(colMajor);
    if (!Number.isFinite(determinant) || determinant === 0) {
      return { value: this.createZeroMatrix(2), isValid: false };
    }
    const result = glMatrix6.mat2.create();
    const success = glMatrix6.mat2.invert(result, colMajor);
    if (!success) {
      return { value: this.createZeroMatrix(2), isValid: false };
    }
    return { value: Array.from(result), isValid: true };
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndex = this.values["a"].type;
    const type = this.getType(typeIndex);
    let result;
    switch (type) {
      case "float4x4":
        result = _Inverse.invert4x4(a);
        break;
      case "float3x3":
        result = _Inverse.invert3x3(a);
        break;
      case "float2x2":
        result = _Inverse.invert2x2(a);
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: result.value, type: typeIndex }, "isValid": { value: result.isValid, type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/debug/Log.ts
var DebugLog = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { message: { defaultValue: [""] }, severity: { defaultValue: [0] } };
    this.name = "DebugLog";
    this.validateConfigurations(this.configuration);
    const { message, severity } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._message = message[0];
    this._severity = Number(severity[0]);
    const valIds = this.parseTemplate(this._message);
    const generatedVals = {};
    for (let i = 0; i < valIds.length; i++) {
      generatedVals[valIds[i]] = { value: [void 0], type: 1 };
    }
    this._templateValues = generatedVals;
  }
  parseTemplate(path) {
    const regex = /{([^}]+)}/g;
    const match = path.match(regex);
    const keys = [];
    if (!match) {
      return keys;
    }
    for (const m of match) {
      const key = m.slice(1, -1);
      keys.push(key);
    }
    return keys;
  }
  populateTemplate(template, vals) {
    let templateCopy = template;
    for (const val of Object.keys(vals)) {
      const typeName = this.getType(this.values[val].type);
      templateCopy = templateCopy.replace(`{${val}}`, formatValue(vals[val], typeName));
    }
    return templateCopy;
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const templateValues = this.evaluateAllValues(Object.keys(this._templateValues));
    const populatedTemplate = this.populateTemplate(this._message, templateValues);
    this.graphEngine.processNodeStarted(this);
    if (this._severity === 0) {
      console.log(`[DebugLog #${this.index}]`, populatedTemplate);
    } else if (this._severity === 1) {
      console.warn(`[DebugLog #${this.index}]`, populatedTemplate);
    } else if (this._severity === 2) {
      console.error(`[DebugLog #${this.index}]`, populatedTemplate);
    }
    super.processNode(flowSocket);
  }
};
function formatValue(value, typeName) {
  if (value === null) {
    return "null";
  }
  if (value === void 0) {
    return "undefined";
  }
  switch (typeName) {
    case "bool":
    case "int":
    case "float":
      return value.toString();
    case "float2":
      return `[${value[0]}, ${value[1]}]`;
    case "float3":
      return `[${value[0]}, ${value[1]}, ${value[2]}]`;
    case "float4":
      return `[${value[0]}, ${value[1]}, ${value[2]}, ${value[3]}]`;
    case "float2x2":
      return `[
                [${value[0]}, ${value[1]}],
                [${value[2]}, ${value[3]}]
            ]`;
    case "float3x3":
      return `[
                [${value[0]}, ${value[1]}, ${value[2]}],
                [${value[3]}, ${value[4]}, ${value[5]}],
                [${value[6]}, ${value[7]}, ${value[8]}]
            ]`;
    case "float4x4":
      return `[
                [${value[0]}, ${value[1]}, ${value[2]}, ${value[3]}],
                [${value[4]}, ${value[5]}, ${value[6]}, ${value[7]}],
                [${value[8]}, ${value[9]}, ${value[10]}, ${value[11]}],
                [${value[12]}, ${value[13]}, ${value[14]}, ${value[15]}]
            ]`;
    default:
      return value.toString();
  }
}

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatAngleBetween.ts
var QuatAngleBetween = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "QuatAngleBetweenNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== "float4") {
      throw Error(`a should be of type float4, got ${typeA}`);
    }
    if (typeB !== "float4") {
      throw Error(`b should be of type float4, got ${typeB}`);
    }
    const dotProduct = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    const angle = 2 * Math.acos(dotProduct);
    return { "value": { value: [angle], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatSlerp.ts
import * as glMatrix7 from "gl-matrix";
var QuatSlerp = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {} };
    this.name = "QuatSlerpNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const typeIndexC = this.values["c"].type;
    const typeC = this.getType(typeIndexC);
    if (typeA !== "float4") {
      throw Error(`a should be of type float4, got ${typeA}`);
    }
    if (typeB !== "float4") {
      throw Error(`b should be of type float4, got ${typeB}`);
    }
    if (typeC !== "float") {
      throw Error(`c should be of type float, got ${typeC}`);
    }
    const quatA = glMatrix7.quat.create();
    glMatrix7.quat.set(quatA, a[0], a[1], a[2], a[3]);
    const quatB = glMatrix7.quat.create();
    glMatrix7.quat.set(quatB, b[0], b[1], b[2], b[3]);
    const result = glMatrix7.quat.create();
    const t = Number(c);
    glMatrix7.quat.slerp(result, quatA, quatB, t);
    const val = [result[0], result[1], result[2], result[3]];
    return { "value": { value: val, type: this.getTypeIndex("float4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/quaternion/QuatFromUpForward.ts
import * as glMatrix8 from "gl-matrix";
var QuatFromUpForward = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { up: {}, forward: {} };
    this.name = "QuatFromUpForwardNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { up, forward } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexUp = this.values["up"].type;
    const typeUp = this.getType(typeIndexUp);
    const typeIndexForward = this.values["forward"].type;
    const typeForward = this.getType(typeIndexForward);
    if (typeUp !== "float3") {
      throw Error(`up should be of type float3, got ${typeUp}`);
    }
    if (typeForward !== "float3") {
      throw Error(`forward should be of type float3, got ${typeForward}`);
    }
    const fwd = glMatrix8.vec3.fromValues(forward[0], forward[1], forward[2]);
    const upVec = glMatrix8.vec3.fromValues(up[0], up[1], up[2]);
    const right = glMatrix8.vec3.create();
    glMatrix8.vec3.cross(right, upVec, fwd);
    if (glMatrix8.vec3.len(right) < 1e-6) {
      const ax = Math.abs(fwd[0]);
      const ay = Math.abs(fwd[1]);
      const az = Math.abs(fwd[2]);
      let arbitrary;
      if (ax <= ay && ax <= az) {
        arbitrary = glMatrix8.vec3.fromValues(1, 0, 0);
      } else if (ay <= ax && ay <= az) {
        arbitrary = glMatrix8.vec3.fromValues(0, 1, 0);
      } else {
        arbitrary = glMatrix8.vec3.fromValues(0, 0, 1);
      }
      glMatrix8.vec3.cross(right, arbitrary, fwd);
    }
    glMatrix8.vec3.normalize(right, right);
    const trueUp = glMatrix8.vec3.create();
    glMatrix8.vec3.cross(trueUp, fwd, right);
    const m = glMatrix8.mat3.create();
    m[0] = right[0];
    m[1] = right[1];
    m[2] = right[2];
    m[3] = trueUp[0];
    m[4] = trueUp[1];
    m[5] = trueUp[2];
    m[6] = fwd[0];
    m[7] = fwd[1];
    m[8] = fwd[2];
    const outQ = glMatrix8.quat.create();
    glMatrix8.quat.fromMat3(outQ, m);
    glMatrix8.quat.normalize(outQ, outQ);
    const val = [outQ[0], outQ[1], outQ[2], outQ[3]];
    return { "value": { value: val, type: this.getTypeIndex("float4") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/Determinant.ts
var Determinant = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "DeterminantNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float4x4" && typeA !== "float3x3" && typeA !== "float2x2") {
      throw Error("Invalid type");
    }
    let val;
    let unflattenedA;
    switch (typeA) {
      case "float4x4":
        unflattenedA = unflattenMatrix(a, 4);
        val = unflattenedA[0][0] * (unflattenedA[1][1] * (unflattenedA[2][2] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][2]) - unflattenedA[1][2] * (unflattenedA[2][1] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][1]) + unflattenedA[1][3] * (unflattenedA[2][1] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][1])) - unflattenedA[0][1] * (unflattenedA[1][0] * (unflattenedA[2][2] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][2]) - unflattenedA[1][2] * (unflattenedA[2][0] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][0]) + unflattenedA[1][3] * (unflattenedA[2][0] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][0])) + unflattenedA[0][2] * (unflattenedA[1][0] * (unflattenedA[2][1] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][1]) - unflattenedA[1][1] * (unflattenedA[2][0] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][0]) + unflattenedA[1][3] * (unflattenedA[2][0] * unflattenedA[3][1] - unflattenedA[2][1] * unflattenedA[3][0])) - unflattenedA[0][3] * (unflattenedA[1][0] * (unflattenedA[2][1] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][1]) - unflattenedA[1][1] * (unflattenedA[2][0] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][0]) + unflattenedA[1][2] * (unflattenedA[2][0] * unflattenedA[3][1] - unflattenedA[2][1] * unflattenedA[3][0]));
        break;
      case "float3x3":
        unflattenedA = unflattenMatrix(a, 3);
        val = unflattenedA[0][0] * (unflattenedA[1][1] * unflattenedA[2][2] - unflattenedA[1][2] * unflattenedA[2][1]) - unflattenedA[0][1] * (unflattenedA[1][0] * unflattenedA[2][2] - unflattenedA[1][2] * unflattenedA[2][0]) + unflattenedA[0][2] * (unflattenedA[1][0] * unflattenedA[2][1] - unflattenedA[1][1] * unflattenedA[2][0]);
        break;
      case "float2x2":
        unflattenedA = unflattenMatrix(a, 2);
        val = unflattenedA[0][0] * unflattenedA[1][1] - unflattenedA[0][1] * unflattenedA[1][0];
        break;
    }
    return { "value": { value: [val], type: this.getTypeIndex("float") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Transform.ts
var Transform = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "TransformNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const validTypePairings = typeA === "float4" && typeB === "float4x4" || typeA === "float3" && typeB === "float3x3" || typeA === "float2" && typeB === "float2x2";
    if (!validTypePairings) {
      throw Error("Invalid type pairings");
    }
    const dimension = Number(typeA.charAt(typeA.length - 1));
    const val = [];
    for (let row = 0; row < dimension; row++) {
      let sum = 0;
      for (let col = 0; col < dimension; col++) {
        sum += b[col * dimension + row] * a[col];
      }
      val.push(sum);
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/matrix/Transpose.ts
var Transpose = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {} };
    this.name = "TransposeNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    if (typeA !== "float4x4" && typeA !== "float3x3" && typeA !== "float2x2") {
      throw Error("Invalid type");
    }
    const dimension = Number(typeA.charAt(typeA.length - 1));
    const val = [];
    const unflattenedA = unflattenMatrix(a, dimension);
    for (let col = 0; col < dimension; col++) {
      val.push([]);
      for (let row = 0; row < dimension; row++) {
        val[col].push(unflattenedA[row][col]);
      }
    }
    const flattenedVal = flattenMatrix(val);
    return { "value": { value: flattenedVal, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/ref/RefEquality.ts
var RefEquality = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {} };
    this.name = "RefEquality";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error(`input types not equivalent: a=${typeA}, b=${typeB}, values=${JSON.stringify(this.values)}`);
    }
    if (typeA !== "ref") {
      throw Error(`input types not ref: a=${typeA}, b=${typeB}, values=${JSON.stringify(this.values)}`);
    }
    const val = a === b;
    return { "value": { value: [val], type: this.getTypeIndex("bool") } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/StopPropagation.ts
var EventStopPropagation = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { stopImmediate: {}, event: {} };
    this.name = "EventStopPropagation";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { stopImmediate, event } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    if (stopImmediate) {
      this.graphEngine.propagationCancelled.add(event);
    } else {
      this.graphEngine.propagationCancelledPending.add(event);
    }
    super.processNode(flowSocket);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/arithmetic/SmoothStep.ts
var SmoothStep = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {} };
    this.saturate = (x) => {
      return Math.min(Math.max(x, 0), 1);
    };
    this.smoothStep = (a, b, c) => {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const diff = Math.abs(b - a);
      if (diff === 0) {
        return 0;
      }
      const t = this.saturate((c - lo) / diff);
      return t * t * (3 - 2 * t);
    };
    this.name = "SmoothStepNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    let val;
    switch (typeA) {
      case "float":
        val = [this.smoothStep(a, b, c)];
        break;
      case "float2":
        val = [
          this.smoothStep(a[0], b[0], c[0]),
          this.smoothStep(a[1], b[1], c[1])
        ];
        break;
      case "float3":
        val = [
          this.smoothStep(a[0], b[0], c[0]),
          this.smoothStep(a[1], b[1], c[1]),
          this.smoothStep(a[2], b[2], c[2])
        ];
        break;
      case "float4":
        val = [
          this.smoothStep(a[0], b[0], c[0]),
          this.smoothStep(a[1], b[1], c[1]),
          this.smoothStep(a[2], b[2], c[2]),
          this.smoothStep(a[3], b[3], c[3])
        ];
        break;
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/vector/Slerp.ts
import * as glMatrix9 from "gl-matrix";
var THRESHOLD = 1e-6;
var Slerp = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { a: {}, b: {}, c: {} };
    this.name = "SlerpNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { a, b, c } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexA = this.values["a"].type;
    const typeA = this.getType(typeIndexA);
    const typeIndexB = this.values["b"].type;
    const typeB = this.getType(typeIndexB);
    const typeIndexC = this.values["c"].type;
    const typeC = this.getType(typeIndexC);
    if (typeA !== typeB) {
      throw Error("input types not equivalent");
    }
    if (typeC !== "float") {
      throw Error("c must be of type float");
    }
    const t = Number(c);
    let val;
    switch (typeA) {
      case "float2": {
        const lenA = Math.hypot(a[0], a[1]);
        const lenB = Math.hypot(b[0], b[1]);
        if (lenA <= THRESHOLD || lenB <= THRESHOLD) {
          val = [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]];
          break;
        }
        const ax = a[0] / lenA, ay = a[1] / lenA;
        const bx = b[0] / lenB, by = b[1] / lenB;
        let theta = Math.acos(Math.min(Math.max(ax * bx + ay * by, -1), 1));
        if (ax * by - ay * bx < 0) {
          theta = -theta;
        }
        const L = (1 - t) * lenA + t * lenB;
        val = [
          (ax * Math.cos(t * theta) - ay * Math.sin(t * theta)) * L,
          (ax * Math.sin(t * theta) + ay * Math.cos(t * theta)) * L
        ];
        break;
      }
      case "float3": {
        const lenA = Math.hypot(a[0], a[1], a[2]);
        const lenB = Math.hypot(b[0], b[1], b[2]);
        if (lenA <= THRESHOLD || lenB <= THRESHOLD) {
          val = [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1], (1 - t) * a[2] + t * b[2]];
          break;
        }
        const ax = a[0] / lenA, ay = a[1] / lenA, az = a[2] / lenA;
        const bx = b[0] / lenB, by = b[1] / lenB, bz = b[2] / lenB;
        const d = Math.min(Math.max(ax * bx + ay * by + az * bz, -1), 1);
        const L = (1 - t) * lenA + t * lenB;
        if (1 - d <= THRESHOLD) {
          val = [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1], (1 - t) * a[2] + t * b[2]];
          break;
        }
        let rx, ry, rz;
        if (1 + d <= THRESHOLD) {
          if (Math.abs(ax) <= Math.abs(ay) && Math.abs(ax) <= Math.abs(az)) {
            const len = Math.hypot(0, -az, ay);
            rx = 0;
            ry = -az / len;
            rz = ay / len;
          } else if (Math.abs(ay) <= Math.abs(az)) {
            const len = Math.hypot(-az, 0, ax);
            rx = -az / len;
            ry = 0;
            rz = ax / len;
          } else {
            const len = Math.hypot(-ay, ax, 0);
            rx = -ay / len;
            ry = ax / len;
            rz = 0;
          }
        } else {
          const cx = ay * bz - az * by;
          const cy = az * bx - ax * bz;
          const cz = ax * by - ay * bx;
          const cLen = Math.hypot(cx, cy, cz);
          rx = cx / cLen;
          ry = cy / cLen;
          rz = cz / cLen;
        }
        const angle = t * Math.acos(d);
        const s = Math.sin(angle / 2);
        const qx = rx * s, qy = ry * s, qz = rz * s, qw = Math.cos(angle / 2);
        const q = glMatrix9.quat.fromValues(qx, qy, qz, qw);
        const aVec = glMatrix9.vec3.fromValues(ax, ay, az);
        const rotated = glMatrix9.vec3.create();
        glMatrix9.vec3.transformQuat(rotated, aVec, q);
        val = [rotated[0] * L, rotated[1] * L, rotated[2] * L];
        break;
      }
      default:
        throw Error("Invalid type");
    }
    return { "value": { value: val, type: typeIndexA } };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/color/RgbToOkLCh.ts
var M1 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005]
];
var M2 = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766]
];
function cbrt(x) {
  return Math.cbrt(x);
}
var RgbToOkLCh = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { r: {}, g: {}, b: {} };
    this.name = "RgbToOkLChNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { r, g, b } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexFloat = this.getTypeIndex("float");
    const rv = Number(r);
    const gv = Number(g);
    const bv = Number(b);
    const Lp = M1[0][0] * rv + M1[0][1] * gv + M1[0][2] * bv;
    const Mp = M1[1][0] * rv + M1[1][1] * gv + M1[1][2] * bv;
    const Sp = M1[2][0] * rv + M1[2][1] * gv + M1[2][2] * bv;
    const cLp = cbrt(Lp);
    const cMp = cbrt(Mp);
    const cSp = cbrt(Sp);
    const L = M2[0][0] * cLp + M2[0][1] * cMp + M2[0][2] * cSp;
    const a = M2[1][0] * cLp + M2[1][1] * cMp + M2[1][2] * cSp;
    const bOk = M2[2][0] * cLp + M2[2][1] * cMp + M2[2][2] * cSp;
    const chroma = Math.sqrt(a * a + bOk * bOk);
    const hue = Math.atan2(bOk, a);
    return {
      "l": { value: [L], type: typeIndexFloat },
      "c": { value: [chroma], type: typeIndexFloat },
      "h": { value: [hue], type: typeIndexFloat }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/math/color/RgbFromOkLCh.ts
var M3 = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548]
];
var M4 = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701]
];
var RgbFromOkLCh = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { l: {}, c: {}, h: {} };
    this.name = "RgbFromOkLChNode";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    const { l, c, h } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const typeIndexFloat = this.getTypeIndex("float");
    const L = Number(l);
    const C = Number(c);
    const H = Number(h);
    const aOk = C * Math.cos(H);
    const bOk = C * Math.sin(H);
    const Lp = M3[0][0] * L + M3[0][1] * aOk + M3[0][2] * bOk;
    const Mp = M3[1][0] * L + M3[1][1] * aOk + M3[1][2] * bOk;
    const Sp = M3[2][0] * L + M3[2][1] * aOk + M3[2][2] * bOk;
    const Lp3 = Lp * Lp * Lp;
    const Mp3 = Mp * Mp * Mp;
    const Sp3 = Sp * Sp * Sp;
    const rv = M4[0][0] * Lp3 + M4[0][1] * Mp3 + M4[0][2] * Sp3;
    const gv = M4[1][0] * Lp3 + M4[1][1] * Mp3 + M4[1][2] * Sp3;
    const bv = M4[2][0] * Lp3 + M4[2][1] * Mp3 + M4[2][2] * Sp3;
    return {
      "r": { value: [rv], type: typeIndexFloat },
      "g": { value: [gv], type: typeIndexFloat },
      "b": { value: [bv], type: typeIndexFloat }
    };
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/OnSelect.ts
var OnSelect = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { nodeIndex: { defaultValue: [-1] } };
    this.name = "OnSelect";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { nodeIndex } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._nodeIndex = nodeIndex[0];
    this.outValues.selectionPoint = {
      type: this.getTypeIndex("float3"),
      value: [NaN, NaN, NaN]
    };
    this.outValues.selectionRayOrigin = {
      type: this.getTypeIndex("float3"),
      value: [NaN, NaN, NaN]
    };
    this.outValues.selectedNode = {
      type: this.getTypeIndex("ref"),
      value: [null]
    };
    this.outValues.controllerIndex = {
      type: this.getTypeIndex("int"),
      value: [-1]
    };
    this.outValues.event = {
      type: this.getTypeIndex("ref"),
      value: [null]
    };
    this.setUpOnSelect();
    this.graphEngine.selectNodes.push(this);
  }
  setUpOnSelect() {
    const callback = (selectedNode, controllerIndex, selectionPoint, selectionRayOrigin, event) => {
      this.outValues.selectionPoint = {
        type: this.getTypeIndex("float3"),
        value: selectionPoint ?? [NaN, NaN, NaN]
      };
      this.outValues.selectionRayOrigin = {
        type: this.getTypeIndex("float3"),
        value: selectionRayOrigin ?? [NaN, NaN, NaN]
      };
      this.outValues.selectedNode = {
        type: this.getTypeIndex("ref"),
        value: [selectedNode]
      };
      this.outValues.controllerIndex = {
        type: this.getTypeIndex("int"),
        value: [controllerIndex]
      };
      this.outValues.event = {
        type: this.getTypeIndex("ref"),
        value: [event]
      };
      this.addEventToWorkQueue(this.flows.out);
    };
    this.graphEngine.selectableNodesIndices.set(Number(this._nodeIndex), callback);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/animation/AnimationStart.ts
var AnimationStart = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { animation: {}, startTime: {}, endTime: {}, speed: {} };
    this.name = "AnimationStart";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { animation, startTime, endTime, speed } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const animationIndex = this.resolveRef(animation);
    const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;
    const validStartTime = !isNaN(startTime) && isFinite(startTime);
    const validEndTime = !isNaN(endTime);
    const validSpeed = !isNaN(speed) && isFinite(speed) && speed > 0;
    if (validAnimation && validStartTime && validEndTime && validSpeed) {
      this.graphEngine.animationCompletionCallbacks.set(animationIndex, () => {
        if (this.flows.done) {
          this.addEventToWorkQueue(this.flows.done);
        }
      });
      this.graphEngine.startAnimation(animationIndex, startTime, endTime, speed, () => this.graphEngine.completeAnimation(animationIndex));
      if (this.flows.out) {
        this.processFlow(this.flows.out);
      }
    } else {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/animation/AnimationStop.ts
var AnimationStop = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { animation: {} };
    this.name = "AnimationStop";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { animation } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const animationIndex = this.resolveRef(animation);
    const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;
    if (validAnimation) {
      this.graphEngine.animationCompletionCallbacks.delete(animationIndex);
      this.graphEngine.stopAnimation(animationIndex);
      if (this.flows.out) {
        this.processFlow(this.flows.out);
      }
    } else {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/animation/AnimationStopAt.ts
var AnimationStopAt = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { animation: {}, stopTime: {} };
    this.name = "AnimationStopAt";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { animation, stopTime } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const animationIndex = this.resolveRef(animation);
    const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;
    const validStopTime = !isNaN(stopTime) && isFinite(stopTime);
    if (validAnimation && validStopTime) {
      this.graphEngine.animationCompletionCallbacks.delete(animationIndex);
      this.graphEngine.stopAnimationAt(animationIndex, stopTime, () => {
        if (this.flows.done) {
          this.addEventToWorkQueue(this.flows.done);
        }
      });
      if (this.flows.out) {
        this.processFlow(this.flows.out);
      }
    } else {
      if (this.flows.err) {
        this.processFlow(this.flows.err);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/OnHoverIn.ts
var OnHoverIn = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { nodeIndex: { defaultValue: [-1] } };
    this.name = "OnHoverIn";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { nodeIndex } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._nodeIndex = Number(nodeIndex[0]);
    this.outValues.hoveredNode = {
      type: this.getTypeIndex("ref"),
      value: [null]
    };
    this.outValues.controllerIndex = {
      type: this.getTypeIndex("int"),
      value: [-1]
    };
    this.outValues.event = {
      type: this.getTypeIndex("ref"),
      value: [this._nodeIndex]
    };
    this.setUpOnHoverIn();
  }
  setUpOnHoverIn() {
    const callback = (selectedNodeRef, controllerIndex, firstCommonHoverNodeIndex) => {
      const hoverInformation2 = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
      if (hoverInformation2) {
        this.outValues.hoveredNode = {
          type: this.getTypeIndex("ref"),
          value: [selectedNodeRef ?? null]
        };
        this.outValues.controllerIndex = {
          type: this.getTypeIndex("int"),
          value: [controllerIndex]
        };
        this.addEventToWorkQueue(this.flows.out);
      }
      this.graphEngine.queueFunctionCall(() => {
        const parentNodeIndex = this.graphEngine.getParentNodeIndex(this._nodeIndex);
        this.graphEngine.alertOnHoverIn(selectedNodeRef, controllerIndex, parentNodeIndex, firstCommonHoverNodeIndex);
      });
    };
    const hoverInformation = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
    if (hoverInformation) {
      hoverInformation.callbackHoverIn = callback;
    } else {
      this.graphEngine.hoverableNodesIndices.set(this._nodeIndex, { callbackHoverIn: callback });
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/event/OnHoverOut.ts
var OnHoverOut = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { nodeIndex: { defaultValue: [-1] } };
    this.name = "OnHoverOut";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { nodeIndex } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._nodeIndex = Number(nodeIndex[0]);
    this.outValues.hoveredNode = {
      type: this.getTypeIndex("ref"),
      value: [null]
    };
    this.outValues.controllerIndex = {
      type: this.getTypeIndex("int"),
      value: [-1]
    };
    this.outValues.event = {
      type: this.getTypeIndex("ref"),
      value: [this._nodeIndex]
    };
    this.setUpOnHoverOut();
  }
  setUpOnHoverOut() {
    const callback = (selectedNodeRef, controllerIndex, firstCommonHoverNodeIndex) => {
      const hoverInformation2 = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
      if (hoverInformation2) {
        this.outValues.hoveredNode = {
          type: this.getTypeIndex("ref"),
          value: [selectedNodeRef ?? null]
        };
        this.outValues.controllerIndex = {
          type: this.getTypeIndex("int"),
          value: [controllerIndex]
        };
        this.addEventToWorkQueue(this.flows.out);
      }
      this.graphEngine.queueFunctionCall(() => {
        const parentNodeIndex = this.graphEngine.getParentNodeIndex(this._nodeIndex);
        this.graphEngine.alertOnHoverOut(selectedNodeRef, controllerIndex, parentNodeIndex, firstCommonHoverNodeIndex);
      });
    };
    const hoverInformation = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
    if (hoverInformation) {
      hoverInformation.callbackHoverOut = callback;
    } else {
      this.graphEngine.hoverableNodesIndices.set(this._nodeIndex, { callbackHoverOut: callback });
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/BasicBehaveEngine.ts
var behaveEngineNodeRegistry = [
  ["event/onStart", OnStartNode],
  ["event/onTick", OnTickNode],
  ["flow/branch", Branch],
  ["flow/setDelay", SetDelay],
  ["flow/cancelDelay", CancelDelay],
  ["flow/doN", DoN],
  ["flow/for", ForLoop],
  ["flow/multiGate", MultiGate],
  ["flow/sequence", Sequence],
  ["flow/switch", Switch],
  ["flow/throttle", Throttle],
  ["flow/waitAll", WaitAll],
  ["flow/while", WhileLoop],
  ["pointer/get", PointerGet],
  ["pointer/set", PointerSet],
  ["pointer/interpolate", PointerInterpolate],
  ["math/abs", AbsoluteValue],
  ["event/receive", Receive],
  ["event/send", Send],
  ["variable/get", VariableGet],
  ["variable/set", VariableSet],
  ["variable/interpolate", VariableInterpolate],
  ["math/E", Euler],
  ["math/Inf", Inf],
  ["math/NaN", NotANumber],
  ["math/Pi", Pi],
  ["math/Tau", Tau],
  ["math/sign", Sign],
  ["math/trunc", Truncate],
  ["math/floor", Floor],
  ["math/fract", Fraction],
  ["math/ceil", Ceil],
  ["math/round", Round],
  ["math/neg", Negate],
  ["math/add", Add],
  ["math/sub", Subtract],
  ["math/mul", Multiply],
  ["math/div", Divide],
  ["math/rem", Remainder],
  ["math/min", Min],
  ["math/max", Max],
  ["math/mix", Mix],
  ["math/saturate", Saturate],
  ["math/clamp", Clamp],
  ["math/smoothStep", SmoothStep],
  ["math/rad", DegreeToRadians],
  ["math/deg", RadiansToDegrees],
  ["math/sin", Sine],
  ["math/cos", Cosine],
  ["math/tan", Tangent],
  ["math/asin", Arcsine],
  ["math/acos", Arccosine],
  ["math/atan", Arctangent],
  ["math/atan2", Arctangent2],
  ["math/sinh", HyperbolicSine],
  ["math/cosh", HyperbolicCosine],
  ["math/tanh", HyperbolicTangent],
  ["math/asinh", InverseHyperbolicSine],
  ["math/acosh", InverseHyperbolicCosine],
  ["math/atanh", InverseHyperbolicTangent],
  ["math/exp", Exponential],
  ["math/log", Log],
  ["math/log2", Log2],
  ["math/log10", Log10],
  ["math/pow", Power],
  ["math/sqrt", SquareRoot],
  ["math/cbrt", CubeRoot],
  ["math/random", Random],
  ["math/lt", LessThan],
  ["math/le", LessThanOrEqualTo],
  ["math/eq", Equality],
  ["math/ge", GreaterThanOrEqualTo],
  ["math/gt", GreaterThan],
  ["math/dot", Dot],
  ["math/cross", Cross],
  ["math/normalize", Normalize],
  ["math/rotate2D", Rotate2D],
  ["math/rotate3D", Rotate3D],
  ["math/length", VectorLength],
  ["math/slerp", Slerp],
  ["math/isInf", IsInfNode],
  ["math/isNaN", IsNaNNode],
  ["math/select", Select],
  ["math/switch", MathSwitch],
  ["math/extract2", Extract2],
  ["math/extract3", Extract3],
  ["math/extract4", Extract4],
  ["math/extract2x2", Extract2x2],
  ["math/extract3x3", Extract3x3],
  ["math/extract4x4", Extract4x4],
  ["math/combine2", Combine2],
  ["math/combine3", Combine3],
  ["math/combine4", Combine4],
  ["math/combine2x2", Combine2x2],
  ["math/combine3x3", Combine3x3],
  ["math/combine4x4", Combine4x4],
  ["type/boolToInt", BoolToInt],
  ["type/boolToFloat", BoolToFloat],
  ["type/floatToBool", FloatToBool],
  ["type/floatToInt", FloatToInt],
  ["type/intToBool", IntToBool],
  ["type/intToFloat", IntToFloat],
  ["math/not", Not],
  ["math/xor", Xor],
  ["math/or", Or],
  ["math/and", And],
  ["math/lsl", LeftShift],
  ["math/asr", RightShift],
  ["math/clz", CountLeadingZeros],
  ["math/ctz", CountTrailingZeros],
  ["math/popcnt", CountOneBits],
  ["math/quatMul", QuatMul],
  ["math/quatConjugate", QuatConjugate],
  ["math/quatFromAxisAngle", QuatFromAxisAngle],
  ["math/quatAngleBetween", QuatAngleBetween],
  ["math/quatSlerp", QuatSlerp],
  ["math/quatToAxisAngle", QuatToAxisAngle],
  ["math/quatFromDirections", QuatFromDirections],
  ["math/quatFromUpForward", QuatFromUpForward],
  ["math/quatFromAngles", QuatFromAngles],
  ["math/matDecompose", MatDecompose],
  ["math/matCompose", MatCompose],
  ["math/determinant", Determinant],
  ["math/transform", Transform],
  ["math/transpose", Transpose],
  ["math/matMul", MatMul],
  ["math/inverse", Inverse],
  ["debug/log", DebugLog],
  ["event/stopPropagation", EventStopPropagation],
  ["ref/eq", RefEquality],
  ["math/rgbToOkLCh", RgbToOkLCh],
  ["math/rgbFromOkLCh", RgbFromOkLCh],
  ["animation/start", AnimationStart],
  ["animation/stop", AnimationStop],
  ["animation/stopAt", AnimationStopAt],
  ["event/onSelect", OnSelect],
  ["event/onHoverIn", OnHoverIn],
  ["event/onHoverOut", OnHoverOut]
];
var BasicBehaveEngine = class {
  constructor(fps, eventBus) {
    this.dispose = () => {
      if (this._timerID !== null) {
        clearTimeout(this._timerID);
        this._timerID = null;
      }
      this.clearScheduledDelays();
      this.clearEventList();
      this.clearCustomEventListeners();
    };
    this.pushScheduledDelay = (delay) => {
      this.jsonPtrTrie.addPath(`/extensions/KHR_interactivity/delays/${this._scheduledDelays.length}`, () => [delay], () => void 0, "ref", true);
      this._scheduledDelays.push(delay);
    };
    this.getScheduledDelay = (index) => {
      if (index >= this._scheduledDelays.length || index < 0) {
        return void 0;
      }
      return this._scheduledDelays[index];
    };
    this.cancelScheduledDelay = (index) => {
      const delay = this.getScheduledDelay(index);
      if (delay !== void 0) {
        this.jsonPtrTrie.removePath(`/extensions/KHR_interactivity/delays/${index}`);
        clearTimeout(delay);
        this._scheduledDelays[index] = void 0;
      }
    };
    this.removeScheduledDelay = (index) => {
      if (index >= 0 && index < this._scheduledDelays.length) {
        this.jsonPtrTrie.removePath(`/extensions/KHR_interactivity/delays/${index}`);
        this._scheduledDelays[index] = void 0;
      }
    };
    this.getEventList = () => {
      return this.eventBus.getEventList();
    };
    this.clearEventList = () => {
      this.eventBus.clearEventList();
    };
    this.addEvent = (event) => {
      this.eventBus.addEvent(event);
    };
    this.clearValueEvaluationCache = () => {
      this.valueEvaluationCache.clear();
    };
    this.addEntryToValueEvaluationCache = (key, val) => {
      this.valueEvaluationCache.set(key, val);
    };
    this.getValueEvaluationCacheValue = (key) => {
      return this.valueEvaluationCache.get(key);
    };
    this.registerJsonPointer = (jsonPtr, getterCallback, setterCallback, typeName, readOnly) => {
      this.jsonPtrTrie.addPath(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    };
    this.getRegisteredJsonPointers = () => {
      return this.jsonPtrTrie.getRegisteredPaths();
    };
    this.isValidJsonPtr = (jsonPtr) => {
      return this.jsonPtrTrie.isPathValid(jsonPtr);
    };
    this.isReadOnly = (jsonPtr) => {
      return this.jsonPtrTrie.isReadOnly(jsonPtr);
    };
    this.getPathValue = (path) => {
      return this.jsonPtrTrie.getPathValue(path);
    };
    this.getPathTypeName = (path) => {
      return this.jsonPtrTrie.getPathTypeName(path);
    };
    this.setPathValue = (path, value) => {
      this.jsonPtrTrie.setPathValue(path, value);
    };
    this.addCustomEventListener = (name, func) => {
      this.eventBus.addCustomEventListener(name, func);
    };
    this.dispatchCustomEvent = (name, vals) => {
      this.eventBus.dispatchCustomEvent(name, vals);
    };
    this.clearCustomEventListeners = () => {
      this.eventBus.clearCustomEventListeners();
    };
    this.queueFunctionCall = (func) => {
      this.eventBus.addEvent({ func });
    };
    this.registerGraphEventPointers = () => {
      const eventCountWithLifecycleEvents = (this.events?.length ?? 0) + 2;
      this.registerJsonPointer(
        `/extensions/KHR_interactivity/events/${eventCountWithLifecycleEvents}`,
        (path) => [path],
        () => void 0,
        "ref",
        true
      );
    };
    this.loadBehaveGraph = (behaveGraph, runGraph = true) => {
      this.hoverableNodesIndices.clear();
      this.selectableNodesIndices.clear();
      this.lastHoveredNodeIndices.clear();
      this.propagationCancelled.clear();
      this.propagationCancelledPending.clear();
      this._pauseDuration = 0;
      this._pauseTickTime = NaN;
      try {
        this.validateGraph(behaveGraph);
      } catch (e) {
        throw new Error(`The graph is invalid ${e}`);
      }
      this.nodes = behaveGraph.nodes;
      this._variables = behaveGraph.variables;
      this.events = behaveGraph.events;
      this.types = behaveGraph.types;
      this.idToBehaviourNodeMap.clear();
      this.registerGraphEventPointers();
      const defaultProps = {
        idToBehaviourNodeMap: this.idToBehaviourNodeMap,
        variables: this._variables,
        events: this.events
      };
      this._variables.forEach((variable) => {
        if (variable.value === void 0) {
          variable.value = [0];
        }
        if (!Array.isArray(variable.value)) {
          variable.value = [variable.value];
        }
      });
      let index = 0;
      this.nodes.forEach((node) => {
        const nodeDeclaration = behaveGraph.declarations[node.declaration];
        if (nodeDeclaration === void 0) {
          throw Error(`Unrecognized node declaration ${node.declaration} but declerations has ${Object.keys(behaveGraph.declarations).length} keys`);
        }
        const behaviourNodeProps = {
          ...defaultProps,
          index,
          flows: node.flows || {},
          values: node.values || {},
          configuration: node.configuration || {},
          variables: behaveGraph.variables,
          types: behaveGraph.types,
          graphEngine: this,
          declaration: nodeDeclaration,
          addEventToWorkQueue: this.addEventToWorkQueue
        };
        const nodeType = nodeDeclaration.op;
        let behaviourNode;
        if (this.registry.get(nodeType) === void 0) {
          behaviourNode = new NoOpNode(behaviourNodeProps);
        } else {
          behaviourNode = this.registry.get(nodeType).init(behaviourNodeProps);
        }
        this.idToBehaviourNodeMap.set(index, behaviourNode);
        index++;
      });
      this.onTickNodeIndices = this.nodes.map((node, idx) => behaveGraph.declarations[node.declaration].op === "event/onTick" ? idx : -1).filter((idx) => idx !== -1);
      const onStartIndices = this.nodes.map((node, idx) => behaveGraph.declarations[node.declaration].op === "event/onStart" ? idx : -1).filter((idx) => idx !== -1);
      for (const startNodeIndex of onStartIndices) {
        const startFlow = { node: startNodeIndex, socket: "start" };
        this.addEventToWorkQueue(startFlow);
      }
      if (this._timerID !== null) {
        clearTimeout(this._timerID);
        this._timerID = null;
      }
      if (runGraph) {
        this.executeEventQueue();
      }
    };
    this.pauseEventQueue = () => {
      this._pauseTickTime = performance.now();
      if (this._timerID !== null) {
        clearTimeout(this._timerID);
        this._timerID = null;
      }
    };
    this.playEventQueue = () => {
      if (this._timerID === null) {
        this.executeEventQueue();
      }
    };
    this.processNodeStarted = (behaveEngineNode) => {
    };
    this.processAddingNodeToQueue = (flowBeingAdded) => {
    };
    this.processExecutingNextNode = (flowBeingExecuted) => {
    };
    this.registerKnownPointers = () => {
    };
    this.getWorld = () => {
    };
    this.getParentNodeIndex = (nodeIndex) => {
      return void 0;
    };
    this.isSlerpPath = (path) => {
      if (path.endsWith("rotation")) {
        return true;
      } else {
        return false;
      }
    };
    this.animateCubicBezier = (path, p1, p2, initialValue, targetValue, duration, valueType, callback) => {
      this.clearPointerInterpolation(path);
      const startTime = this.lastTickTime;
      const action = async () => {
        const elapsedDuration = (this.lastTickTime - startTime) / 1e3;
        const t = Math.min(elapsedDuration / duration, 1);
        const q = cubicBezierEase(t, p1, p2);
        if (valueType === "float3") {
          const value = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1]), linearFloat(q, initialValue[2], targetValue[2])];
          this.setPathValue(path, value);
        } else if (valueType === "float4") {
          if (this.isSlerpPath(path)) {
            const value = slerpFloat4(q, initialValue, targetValue);
            this.setPathValue(path, value);
          } else {
            const value = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1]), linearFloat(q, initialValue[2], targetValue[2]), linearFloat(q, initialValue[3], targetValue[3])];
            this.setPathValue(path, value);
          }
        } else if (valueType === "float") {
          const value = [linearFloat(q, initialValue[0], targetValue[0])];
          this.setPathValue(path, value);
        } else if (valueType == "float2") {
          const value = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1])];
          this.setPathValue(path, value);
        }
        if (elapsedDuration >= duration) {
          this.setPathValue(path, targetValue);
          this.clearPointerInterpolation(path);
          callback();
        }
      };
      this.setPointerInterpolationCallback(path, { action });
    };
    this.registerKnownBehaviorNodes = () => {
      for (const [op, behaveEngineNode] of behaveEngineNodeRegistry) {
        this.registerBehaveEngineNode(op, behaveEngineNode);
      }
    };
    this.validateGraph = (behaviorGraph) => {
      const nodes = behaviorGraph.nodes;
      let index = 0;
      for (const node of nodes) {
        if (node.values !== void 0) {
          for (const key of Object.keys(node.values)) {
            if (node.values[key].node !== void 0) {
              const referencedNode = Number(node.values[key].node);
              if (referencedNode >= index) {
                const opOf = (idx) => {
                  const declIdx = nodes[idx]?.declaration;
                  return behaviorGraph.declarations?.[declIdx]?.op ?? `declaration ${declIdx}`;
                };
                throw Error(`Invalid reference: node ${index} ('${opOf(index)}', socket '${key}') references node ${referencedNode} ('${opOf(referencedNode)}'), but a node may only reference nodes that appear earlier in the array (index < ${index}). Reorder the nodes so that node ${referencedNode} comes before node ${index}.`);
              }
            }
          }
        }
        index++;
      }
    };
    this.registerBehaveEngineNode = (type, behaviorNode) => {
      if (this.registry.has(type)) {
        console.warn(`Behavior node ${type} is already registered and will be overwritten`);
      }
      this.registry.set(type, behaviorNode);
    };
    this.addEventToWorkQueue = (flow) => {
      if (flow === void 0 || flow.node === void 0) {
        return;
      }
      const nextNode = this.idToBehaviourNodeMap.get(Number(flow.node));
      if (nextNode === void 0) {
        return;
      }
      this.processAddingNodeToQueue(flow);
      this.eventBus.addEvent({ behaveNode: nextNode, inSocketId: flow.socket });
    };
    this.executeEventQueueTick = () => {
      this.executeEventQueue(true);
    };
    this.executeEventQueue = (manualStep = false) => {
      this._lastTickTime = performance.now();
      if (!isNaN(this._pauseTickTime)) {
        this._pauseDuration += this._lastTickTime - this._pauseTickTime;
        this._pauseTickTime = NaN;
      }
      this.propagationCancelled.clear();
      this.propagationCancelledPending.clear();
      const eventQueueCopy = [...this.eventBus.getEventList()];
      this.eventBus.clearEventList();
      while (eventQueueCopy.length > 0) {
        const eventToStart = eventQueueCopy[0];
        if (eventToStart.behaveNode) {
          eventToStart.behaveNode.processNode(eventToStart.inSocketId);
        } else if (eventToStart.func) {
          eventToStart.func();
        }
        eventQueueCopy.splice(0, 1);
      }
      for (const interpolation of Object.values(this.eventBus.getVariableInterpolationCallbacks())) {
        interpolation.action();
      }
      for (const interpolation of Object.values(this.eventBus.getPointerInterpolationCallbacks())) {
        interpolation.action();
      }
      for (const onTickNodeIndex of this.onTickNodeIndices) {
        const tickFlow = { node: onTickNodeIndex, socket: "tick" };
        const tickNode = this.idToBehaviourNodeMap.get(Number(tickFlow.node));
        tickNode.processNode();
      }
      if (this._timerID !== null) {
        clearTimeout(this._timerID);
      }
      if (manualStep) {
        return;
      }
      this._timerID = setTimeout(() => {
        this.executeEventQueue();
      }, 1e3 / this.fps);
    };
    this.flushPendingPropagationCancellations = () => {
      for (const event of this.propagationCancelledPending) {
        this.propagationCancelled.add(event);
      }
      this.propagationCancelledPending.clear();
    };
    this.registry = /* @__PURE__ */ new Map();
    this.idToBehaviourNodeMap = /* @__PURE__ */ new Map();
    this.jsonPtrTrie = new JsonPtrTrie();
    this._fps = fps;
    this.valueEvaluationCache = /* @__PURE__ */ new Map();
    this.onTickNodeIndices = [];
    this._lastTickTime = NaN;
    this._pauseTickTime = NaN;
    this._pauseDuration = 0;
    this.eventBus = eventBus;
    this._variables = [];
    this.events = [];
    this._scheduledDelays = [];
    this.nodes = [];
    this.types = [];
    this._timerID = null;
    this.hoverableNodesIndices = /* @__PURE__ */ new Map();
    this.lastHoveredNodeIndices = /* @__PURE__ */ new Map();
    this.selectableNodesIndices = /* @__PURE__ */ new Map();
    this.selectNodes = [];
    this.rigidBodyTriggerNodeIndices = /* @__PURE__ */ new Map();
    this.propagationCancelled = /* @__PURE__ */ new Set();
    this.propagationCancelledPending = /* @__PURE__ */ new Set();
    this.animationCompletionCallbacks = /* @__PURE__ */ new Map();
    this.registerKnownBehaviorNodes();
  }
  get lastTickTime() {
    return this._lastTickTime - this._pauseDuration;
  }
  get fps() {
    return this._fps;
  }
  get variables() {
    return this._variables;
  }
  completeAnimation(animationIndex) {
    const callback = this.animationCompletionCallbacks.get(animationIndex);
    callback?.();
    this.animationCompletionCallbacks.delete(animationIndex);
  }
  startAnimation(animationIndex, startTime, endTime, speed, callback) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stopAnimation(animationIndex) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stopAnimationAt(animationIndex, stopTime, callback) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyImpulseToRigidBody(nodeIndex, linearImpulse, angularImpulse) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyPointImpulseToRigidBody(nodeIndex, impulse, position) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rayCastRigidBodies(rayStart, rayEnd, collisionFilterIndex) {
    return { hitNodeIndex: -1, hitFraction: void 0, hitNormal: void 0 };
  }
  rigidBodyTriggerEntered(nodeIndex, colliderNodeIndex, motionNodeIndex) {
    const callback = this.rigidBodyTriggerNodeIndices.get(nodeIndex)?.triggerEntered;
    if (callback) {
      callback(colliderNodeIndex, motionNodeIndex);
    }
  }
  rigidBodyTriggerExited(nodeIndex, colliderNodeIndex, motionNodeIndex) {
    const callback = this.rigidBodyTriggerNodeIndices.get(nodeIndex)?.triggerExited;
    if (callback) {
      callback(colliderNodeIndex, motionNodeIndex);
    }
  }
  select(selectedNodeIndex, controllerIndex, selectionPoint, selectionRayOrigin) {
    const onSelectEventIndex = this.events.findIndex((event) => event.id === "onSelect");
    const eventRef = `/extensions/KHR_interactivity/events/${onSelectEventIndex}`;
    for (let nodeIndex = selectedNodeIndex; ; ) {
      this.flushPendingPropagationCancellations();
      if (this.propagationCancelled.has(eventRef)) {
        break;
      }
      const callback = this.selectableNodesIndices.get(nodeIndex);
      if (callback !== void 0) {
        callback(`/nodes/${selectedNodeIndex}`, controllerIndex, selectionPoint, selectionRayOrigin, eventRef);
        return;
      }
      const parent = this.getParentNodeIndex(nodeIndex);
      if (parent === void 0) {
        return;
      }
      nodeIndex = parent;
    }
  }
  hoverOn(nodeIndex, controllerIndex) {
    const lastHoverNodeIndex = this.lastHoveredNodeIndices.get(controllerIndex);
    if (nodeIndex === lastHoverNodeIndex) {
      return;
    }
    const oldHoverIndicies = /* @__PURE__ */ new Set();
    let firstCommonHoverNodeIndex = void 0;
    if (lastHoverNodeIndex !== void 0 && nodeIndex !== void 0) {
      let currentOldHoverNodeIndex = lastHoverNodeIndex;
      while (currentOldHoverNodeIndex !== void 0) {
        oldHoverIndicies.add(currentOldHoverNodeIndex);
        currentOldHoverNodeIndex = this.getParentNodeIndex(currentOldHoverNodeIndex);
      }
      let currentHoverNodeIndex = nodeIndex;
      while (currentHoverNodeIndex !== void 0) {
        if (oldHoverIndicies.has(currentHoverNodeIndex)) {
          firstCommonHoverNodeIndex = currentHoverNodeIndex;
          break;
        }
        currentHoverNodeIndex = this.getParentNodeIndex(currentHoverNodeIndex);
      }
    }
    const lastHoverNodeRef = lastHoverNodeIndex !== void 0 ? `/nodes/${lastHoverNodeIndex}` : void 0;
    const newHoverNodeRef = nodeIndex !== void 0 ? `/nodes/${nodeIndex}` : void 0;
    this.alertOnHoverOut(lastHoverNodeRef, controllerIndex, lastHoverNodeIndex, firstCommonHoverNodeIndex);
    this.alertOnHoverIn(newHoverNodeRef, controllerIndex, nodeIndex, firstCommonHoverNodeIndex);
    this.lastHoveredNodeIndices.set(controllerIndex, nodeIndex);
  }
  alertOnHoverIn(selectedNodeRef, controllerIndex, currentHoverNodeIndex, firstCommonHoverNodeIndex) {
    while (currentHoverNodeIndex !== void 0 && currentHoverNodeIndex !== firstCommonHoverNodeIndex) {
      const hoverInformation = this.hoverableNodesIndices.get(currentHoverNodeIndex);
      if (hoverInformation?.callbackHoverIn !== void 0) {
        hoverInformation.callbackHoverIn(selectedNodeRef, controllerIndex, firstCommonHoverNodeIndex);
        break;
      }
      currentHoverNodeIndex = this.getParentNodeIndex(currentHoverNodeIndex);
    }
  }
  alertOnHoverOut(selectedNodeRef, controllerIndex, currentHoverNodeIndex, firstCommonHoverNodeIndex) {
    while (currentHoverNodeIndex !== void 0 && currentHoverNodeIndex !== firstCommonHoverNodeIndex) {
      const hoverInformation = this.hoverableNodesIndices.get(currentHoverNodeIndex);
      if (hoverInformation?.callbackHoverOut !== void 0) {
        hoverInformation.callbackHoverOut(selectedNodeRef, controllerIndex, firstCommonHoverNodeIndex);
        break;
      }
      currentHoverNodeIndex = this.getParentNodeIndex(currentHoverNodeIndex);
    }
  }
  clearScheduledDelays() {
    for (const delay of this._scheduledDelays) {
      if (delay !== void 0) {
        clearTimeout(delay);
      }
    }
    this._scheduledDelays = [];
  }
  get scheduledDelays() {
    return this._scheduledDelays;
  }
  setPointerInterpolationCallback(path, action) {
    this.eventBus.setPointerInterpolationCallback(path, action);
  }
  setVariableInterpolationCallback(variable, action) {
    this.eventBus.setVariableInterpolationCallback(variable, action);
  }
  clearPointerInterpolation(path) {
    this.eventBus.clearPointerInterpolation(path);
  }
  clearVariableInterpolation(variable) {
    this.eventBus.clearVariableInterpolation(variable);
  }
  isEventPropagationCancelled(event) {
    return this.propagationCancelled.has(event);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/eventBuses/DOMEventBus.ts
var DOMEventBus = class {
  constructor() {
    this.getEventList = () => {
      return this.eventList;
    };
    this.clearEventList = () => {
      this.eventList = [];
    };
    this.addEvent = (event) => {
      this.eventList.push(event);
    };
    this.addCustomEventListener = (name, func) => {
      if (!this.customEventListeners[name]) {
        this.customEventListeners[name] = [];
        const eventListener = (e) => {
          this.customEventListeners[name].forEach((func2) => {
            this.eventList.push({ func: () => func2(e), inSocketId: name });
          });
        };
        document.addEventListener(name, eventListener);
        this.eventListeners[name] = eventListener;
      }
      this.customEventListeners[name].push(func);
    };
    this.dispatchCustomEvent = (name, vals) => {
      const event = new CustomEvent(name, { detail: vals });
      document.dispatchEvent(event);
    };
    this.getCustomEventsNames = () => {
      return Object.keys(this.customEventListeners);
    };
    this.clearCustomEventListeners = () => {
      this.customEventListeners = {};
      Object.keys(this.eventListeners).forEach((name) => {
        document.removeEventListener(name, this.eventListeners[name]);
      });
      this.eventListeners = {};
    };
    this.setVariableInterpolationCallback = (variable, action) => {
      this.variableInterpolationCallbacks[variable] = action;
    };
    this.clearVariableInterpolation = (variable) => {
      delete this.variableInterpolationCallbacks[variable];
    };
    this.getVariableInterpolationCallbacks = () => {
      return this.variableInterpolationCallbacks;
    };
    this.setPointerInterpolationCallback = (pointer, action) => {
      this.pointerInterpolationCallbacks[pointer] = action;
    };
    this.clearPointerInterpolation = (pointer) => {
      delete this.pointerInterpolationCallbacks[pointer];
    };
    this.getPointerInterpolationCallbacks = () => {
      return this.pointerInterpolationCallbacks;
    };
    this.eventList = [];
    this.customEventListeners = {};
    this.eventListeners = {};
    this.variableInterpolationCallbacks = {};
    this.pointerInterpolationCallbacks = {};
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/rigid_body/ApplyImpulse.ts
var ApplyImpulse = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { nodeIndex: {}, linearImpulse: {}, angularImpulse: {} };
    this.name = "ApplyImpulse";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { nodeIndex, linearImpulse, angularImpulse } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    this.graphEngine.applyImpulseToRigidBody(nodeIndex, linearImpulse, angularImpulse);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/rigid_body/ApplyPointImpulse.ts
var ApplyPointImpulse = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { nodeIndex: {}, impulse: {}, position: {} };
    this.name = "ApplyPointImpulse";
    this.validateValues(this.values);
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { nodeIndex, impulse, position } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    this.graphEngine.applyPointImpulseToRigidBody(nodeIndex, impulse, position);
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/rigid_body/RayCast.ts
var RayCast = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_VALUES = { rayStart: {}, rayEnd: {}, collisionFilterIndex: {} };
    this.name = "RayCast";
    this.validateValues(this.values);
    this.outValues.hitNode = { value: [-1], type: this.getTypeIndex("ref") };
    this.outValues.hitFraction = { value: [NaN], type: this.getTypeIndex("float") };
    this.outValues.hitNormal = { value: [NaN, NaN, NaN], type: this.getTypeIndex("vec3") };
  }
  processNode(flowSocket) {
    this.graphEngine.clearValueEvaluationCache();
    const { rayStart, rayEnd, collisionFilterIndex } = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
    this.graphEngine.processNodeStarted(this);
    const hitResult = this.graphEngine.rayCastRigidBodies(rayStart, rayEnd, collisionFilterIndex);
    if (hitResult.hitNodeIndex < 0) {
      this.outValues.hitNode = { value: [-1], type: this.getTypeIndex("ref") };
      this.outValues.hitFraction = { value: [NaN], type: this.getTypeIndex("float") };
      this.outValues.hitNormal = { value: [NaN, NaN, NaN], type: this.getTypeIndex("vec3") };
      if (this.flows.miss) {
        this.processFlow(this.flows.miss);
      }
    } else {
      this.outValues.hitNode = { value: [hitResult.hitNodeIndex], type: this.getTypeIndex("ref") };
      this.outValues.hitFraction = { value: [hitResult.hitFraction], type: this.getTypeIndex("float") };
      this.outValues.hitNormal = { value: hitResult.hitNormal, type: this.getTypeIndex("vec3") };
      if (this.flows.hit) {
        this.processFlow(this.flows.hit);
      }
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/rigid_body/TriggerEntered.ts
var TriggerEntered = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { nodeIndex: { defaultValue: [-1] } };
    this.name = "TriggerEntered";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { nodeIndex } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._nodeIndex = Number(nodeIndex[0]);
    this.outValues.colliderNode = {
      type: this.getTypeIndex("ref"),
      value: [-1]
    };
    this.outValues.motionNode = {
      type: this.getTypeIndex("ref"),
      value: [-1]
    };
    this.setUpOnTriggerEntered();
  }
  setUpOnTriggerEntered() {
    const callback = (colliderNodeRef, motionNodeRef) => {
      this.outValues.colliderNode = {
        type: this.getTypeIndex("ref"),
        value: [colliderNodeRef]
      };
      this.outValues.motionNode = {
        type: this.getTypeIndex("ref"),
        value: [motionNodeRef ?? -1]
      };
      console.log("TriggerEntered", { node: this._nodeIndex, outValues: this.outValues });
      this.addEventToWorkQueue(this.flows.out);
    };
    const triggerCallbacks = this.graphEngine.rigidBodyTriggerNodeIndices.get(this._nodeIndex);
    if (triggerCallbacks) {
      triggerCallbacks.triggerEntered = callback;
    } else {
      this.graphEngine.rigidBodyTriggerNodeIndices.set(this._nodeIndex, { triggerEntered: callback });
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/nodes/rigid_body/TriggerExited.ts
var TriggerExited = class extends BehaveEngineNode {
  constructor(props) {
    super(props);
    this.REQUIRED_CONFIGURATIONS = { nodeIndex: { defaultValue: [-1] } };
    this.name = "TriggerExited";
    this.validateValues(this.values);
    this.validateConfigurations(this.configuration);
    const { nodeIndex } = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
    this._nodeIndex = Number(nodeIndex[0]);
    this.outValues.colliderNode = {
      type: this.getTypeIndex("ref"),
      value: [-1]
    };
    this.outValues.motionNode = {
      type: this.getTypeIndex("ref"),
      value: [-1]
    };
    this.setUpOnTriggerExited();
  }
  setUpOnTriggerExited() {
    const callback = (colliderNodeRef, motionNodeRef) => {
      this.outValues.colliderNode = {
        type: this.getTypeIndex("ref"),
        value: [colliderNodeRef]
      };
      this.outValues.motionNode = {
        type: this.getTypeIndex("ref"),
        value: [motionNodeRef ?? -1]
      };
      console.log("TriggerExited", { node: this._nodeIndex, outValues: this.outValues });
      this.addEventToWorkQueue(this.flows.out);
    };
    const triggerCallbacks = this.graphEngine.rigidBodyTriggerNodeIndices.get(this._nodeIndex);
    if (triggerCallbacks) {
      triggerCallbacks.triggerExited = callback;
    } else {
      this.graphEngine.rigidBodyTriggerNodeIndices.set(this._nodeIndex, { triggerExited: callback });
    }
  }
};

// vendor/khronos-interactivity/BasicBehaveEngine/ADecorator.ts
var ADecorator = class {
  constructor(behaveEngine) {
    this.registerJsonPointer = (jsonPtr, getterCallback, setterCallback, typeName, readOnly) => {
      this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    };
    this.behaveEngine = behaveEngine;
  }
  /**
   * BasicBehaveEngine calls some of its own hooks internally (e.g. `this.getWorld()`,
   * `this.getParentNodeIndex()`) so the decorator's implementation has to be reachable via the
   * wrapped engine's own properties, not just via the decorator instance. Subclasses must call
   * this once, after their own hook fields (getWorld/getParentNodeIndex/startAnimation/
   * stopAnimation/stopAnimationAt) are assigned, to bridge them onto the engine.
   */
  bridgeEngineHooks() {
    this.behaveEngine.getWorld = this.getWorld;
    this.behaveEngine.getParentNodeIndex = this.getParentNodeIndex;
    this.behaveEngine.startAnimation = this.startAnimation;
    this.behaveEngine.stopAnimation = this.stopAnimation;
    this.behaveEngine.stopAnimationAt = this.stopAnimationAt;
  }
  /** Tears down listeners/observers registered by this decorator. Call before discarding it. */
  dispose() {
    this.behaveEngine.dispose();
  }
  registerRigidBodyNodes() {
    this.behaveEngine.registerBehaveEngineNode("rigid_body/applyImpulse", ApplyImpulse);
    this.behaveEngine.registerBehaveEngineNode("rigid_body/applyPointImpulse", ApplyPointImpulse);
    this.behaveEngine.registerBehaveEngineNode("rigid_body/rayCast", RayCast);
    this.behaveEngine.registerBehaveEngineNode("event/rigid_body_triggerEntered", TriggerEntered);
    this.behaveEngine.registerBehaveEngineNode("event/rigid_body_triggerExited", TriggerExited);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyImpulseToRigidBody(nodeIndex, linearImpulse, angularImpulse) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyPointImpulseToRigidBody(nodeIndex, impulse, position) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rayCastRigidBodies(rayStart, rayEnd, collisionFilterIndex) {
    return { hitNodeIndex: -1, hitFraction: void 0, hitNormal: void 0 };
  }
  rigidBodyTriggerEntered(nodeIndex, colliderNodeIndex, motionNodeIndex) {
    this.behaveEngine.rigidBodyTriggerEntered(nodeIndex, colliderNodeIndex, motionNodeIndex);
  }
  rigidBodyTriggerExited(nodeIndex, colliderNodeIndex, motionNodeIndex) {
    this.behaveEngine.rigidBodyTriggerExited(nodeIndex, colliderNodeIndex, motionNodeIndex);
  }
  hoverOn(nodeIndex, controllerIndex) {
    this.behaveEngine.hoverOn(nodeIndex, controllerIndex);
  }
  select(selectedNodeIndex, controllerIndex, selectionPoint, selectionRayOrigin) {
    this.behaveEngine.select(selectedNodeIndex, controllerIndex, selectionPoint, selectionRayOrigin);
  }
  getEventList() {
    return this.behaveEngine.getEventList();
  }
  clearEventList() {
    this.behaveEngine.clearEventList();
  }
  addEvent(event) {
    this.behaveEngine.addEvent(event);
  }
  addCustomEventListener(name, func) {
    this.behaveEngine.addCustomEventListener(name, func);
  }
  clearCustomEventListeners() {
    this.behaveEngine.clearCustomEventListeners();
  }
  registerBehaveEngineNode(type, behaveEngineNode) {
    this.behaveEngine.registerBehaveEngineNode(type, behaveEngineNode);
  }
  getRegisteredJsonPointers() {
    return this.behaveEngine.getRegisteredJsonPointers();
  }
  isValidJsonPtr(path) {
    return this.behaveEngine.isValidJsonPtr(path);
  }
  isReadOnly(path) {
    return this.behaveEngine.isReadOnly(path);
  }
  isSlerpPath(path) {
    return this.behaveEngine.isSlerpPath(path);
  }
  animateCubicBezier(path, p1, p2, initialValue, targetValue, duration, valueType, callback) {
    this.behaveEngine.animateCubicBezier(path, p1, p2, initialValue, targetValue, duration, valueType, callback);
  }
  get fps() {
    return this.behaveEngine.fps;
  }
  loadBehaveGraph(behaveGraph, runGraph = true) {
    this.behaveEngine.loadBehaveGraph(behaveGraph, runGraph);
  }
  pauseEventQueue() {
    this.behaveEngine.pauseEventQueue();
  }
  playEventQueue() {
    this.behaveEngine.playEventQueue();
  }
  executeEventQueueTick() {
    this.behaveEngine.executeEventQueueTick();
  }
  dispatchCustomEvent(name, vals) {
    this.behaveEngine.dispatchCustomEvent(name, vals);
  }
  setPathValue(path, targetValue) {
    this.behaveEngine.setPathValue(path, targetValue);
  }
  getPathValue(path) {
    return this.behaveEngine.getPathValue(path);
  }
  getPathTypeName(path) {
    return this.behaveEngine.getPathTypeName(path);
  }
  addEntryToValueEvaluationCache(key, val) {
    this.behaveEngine.addEntryToValueEvaluationCache(key, val);
  }
  clearValueEvaluationCache() {
    this.behaveEngine.clearValueEvaluationCache();
  }
  getValueEvaluationCacheValue(key) {
    return this.behaveEngine.getValueEvaluationCacheValue(key);
  }
  setPointerInterpolationCallback(path, action) {
    this.behaveEngine.setPointerInterpolationCallback(path, action);
  }
  clearPointerInterpolation(path) {
    this.behaveEngine.clearPointerInterpolation(path);
  }
  setVariableInterpolationCallback(variable, action) {
    this.behaveEngine.setVariableInterpolationCallback(variable, action);
  }
  clearVariableInterpolation(variable) {
    this.behaveEngine.clearVariableInterpolation(variable);
  }
};

// vendor/khronos-interactivity/objectModel/generated/glTFSchemaMetadata.ts
var glTFSchemaMetadata = {
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "source": {
    "defaultRepoPath": "../glTF",
    "env": "KHR_INTERACTIVITY_GLTF_REPO",
    "branch": "interactivity",
    "commit": "5e87b48cecf6a3776dc3dfce65e76bb074fe7ae1",
    "ratifiedRef": "origin/main",
    "ratifiedCommit": "5ec16c42e5ed044f26ce2a5b741ed5c57cf622f3"
  },
  "ratifiedKhronosExtensions": [
    "KHR_animation_pointer",
    "KHR_draco_mesh_compression",
    "KHR_lights_punctual",
    "KHR_materials_anisotropy",
    "KHR_materials_clearcoat",
    "KHR_materials_dispersion",
    "KHR_materials_emissive_strength",
    "KHR_materials_ior",
    "KHR_materials_iridescence",
    "KHR_materials_sheen",
    "KHR_materials_specular",
    "KHR_materials_transmission",
    "KHR_materials_unlit",
    "KHR_materials_variants",
    "KHR_materials_volume",
    "KHR_mesh_quantization",
    "KHR_node_visibility",
    "KHR_texture_basisu",
    "KHR_texture_transform",
    "KHR_xmp_json_ld"
  ],
  "schemaFiles": [
    {
      "kind": "core",
      "path": "specification/2.0/schema/accessor.schema.json",
      "ref": "origin/main",
      "schemaName": "accessor.schema.json",
      "id": "accessor.schema.json",
      "title": "Accessor",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/accessor.schema.json",
          "pointer": "#/properties/byteOffset",
          "value": 0
        },
        {
          "sourceId": "specification/2.0/schema/accessor.schema.json",
          "pointer": "#/properties/normalized",
          "value": false
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/accessor.sparse.indices.schema.json",
      "ref": "origin/main",
      "schemaName": "accessor.sparse.indices.schema.json",
      "id": "accessor.sparse.indices.schema.json",
      "title": "Accessor Sparse Indices",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/accessor.sparse.indices.schema.json",
          "pointer": "#/properties/byteOffset",
          "value": 0
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/accessor.sparse.schema.json",
      "ref": "origin/main",
      "schemaName": "accessor.sparse.schema.json",
      "id": "accessor.sparse.schema.json",
      "title": "Accessor Sparse",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/accessor.sparse.values.schema.json",
      "ref": "origin/main",
      "schemaName": "accessor.sparse.values.schema.json",
      "id": "accessor.sparse.values.schema.json",
      "title": "Accessor Sparse Values",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/accessor.sparse.values.schema.json",
          "pointer": "#/properties/byteOffset",
          "value": 0
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/animation.channel.schema.json",
      "ref": "origin/main",
      "schemaName": "animation.channel.schema.json",
      "id": "animation.channel.schema.json",
      "title": "Animation Channel",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/animation.channel.target.schema.json",
      "ref": "origin/main",
      "schemaName": "animation.channel.target.schema.json",
      "id": "animation.channel.target.schema.json",
      "title": "Animation Channel Target",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/animation.sampler.schema.json",
      "ref": "origin/main",
      "schemaName": "animation.sampler.schema.json",
      "id": "animation.sampler.schema.json",
      "title": "Animation Sampler",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/animation.sampler.schema.json",
          "pointer": "#/properties/interpolation",
          "value": "LINEAR"
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/animation.schema.json",
      "ref": "origin/main",
      "schemaName": "animation.schema.json",
      "id": "animation.schema.json",
      "title": "Animation",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/asset.schema.json",
      "ref": "origin/main",
      "schemaName": "asset.schema.json",
      "id": "asset.schema.json",
      "title": "Asset",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/buffer.schema.json",
      "ref": "origin/main",
      "schemaName": "buffer.schema.json",
      "id": "buffer.schema.json",
      "title": "Buffer",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/bufferView.schema.json",
      "ref": "origin/main",
      "schemaName": "bufferView.schema.json",
      "id": "bufferView.schema.json",
      "title": "Buffer View",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/bufferView.schema.json",
          "pointer": "#/properties/byteOffset",
          "value": 0
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/camera.orthographic.schema.json",
      "ref": "origin/main",
      "schemaName": "camera.orthographic.schema.json",
      "id": "camera.orthographic.schema.json",
      "title": "Camera Orthographic",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/camera.perspective.schema.json",
      "ref": "origin/main",
      "schemaName": "camera.perspective.schema.json",
      "id": "camera.perspective.schema.json",
      "title": "Camera Perspective",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/camera.schema.json",
      "ref": "origin/main",
      "schemaName": "camera.schema.json",
      "id": "camera.schema.json",
      "title": "Camera",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/extension.schema.json",
      "ref": "origin/main",
      "schemaName": "extension.schema.json",
      "id": "extension.schema.json",
      "title": "Extension",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/extras.schema.json",
      "ref": "origin/main",
      "schemaName": "extras.schema.json",
      "id": "extras.schema.json",
      "title": "Extras",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/glTF.schema.json",
      "ref": "origin/main",
      "schemaName": "glTF.schema.json",
      "id": "glTF.schema.json",
      "title": "glTF",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/glTFChildOfRootProperty.schema.json",
      "ref": "origin/main",
      "schemaName": "glTFChildOfRootProperty.schema.json",
      "id": "glTFChildOfRootProperty.schema.json",
      "title": "glTF Child of Root Property",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/glTFid.schema.json",
      "ref": "origin/main",
      "schemaName": "glTFid.schema.json",
      "id": "glTFid.schema.json",
      "title": "glTF Id",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/glTFProperty.schema.json",
      "ref": "origin/main",
      "schemaName": "glTFProperty.schema.json",
      "id": "glTFProperty.schema.json",
      "title": "glTF Property",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/image.schema.json",
      "ref": "origin/main",
      "schemaName": "image.schema.json",
      "id": "image.schema.json",
      "title": "Image",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/material.normalTextureInfo.schema.json",
      "ref": "origin/main",
      "schemaName": "material.normalTextureInfo.schema.json",
      "id": "material.normalTextureInfo.schema.json",
      "title": "Material Normal Texture Info",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/material.normalTextureInfo.schema.json",
          "pointer": "#/properties/scale",
          "value": 1
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/material.occlusionTextureInfo.schema.json",
      "ref": "origin/main",
      "schemaName": "material.occlusionTextureInfo.schema.json",
      "id": "material.occlusionTextureInfo.schema.json",
      "title": "Material Occlusion Texture Info",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/material.occlusionTextureInfo.schema.json",
          "pointer": "#/properties/strength",
          "value": 1
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/material.pbrMetallicRoughness.schema.json",
      "ref": "origin/main",
      "schemaName": "material.pbrMetallicRoughness.schema.json",
      "id": "material.pbrMetallicRoughness.schema.json",
      "title": "Material PBR Metallic Roughness",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/material.pbrMetallicRoughness.schema.json",
          "pointer": "#/properties/baseColorFactor",
          "value": [
            1,
            1,
            1,
            1
          ]
        },
        {
          "sourceId": "specification/2.0/schema/material.pbrMetallicRoughness.schema.json",
          "pointer": "#/properties/metallicFactor",
          "value": 1
        },
        {
          "sourceId": "specification/2.0/schema/material.pbrMetallicRoughness.schema.json",
          "pointer": "#/properties/roughnessFactor",
          "value": 1
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/material.schema.json",
      "ref": "origin/main",
      "schemaName": "material.schema.json",
      "id": "material.schema.json",
      "title": "Material",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/material.schema.json",
          "pointer": "#/properties/emissiveFactor",
          "value": [
            0,
            0,
            0
          ]
        },
        {
          "sourceId": "specification/2.0/schema/material.schema.json",
          "pointer": "#/properties/alphaMode",
          "value": "OPAQUE"
        },
        {
          "sourceId": "specification/2.0/schema/material.schema.json",
          "pointer": "#/properties/alphaCutoff",
          "value": 0.5
        },
        {
          "sourceId": "specification/2.0/schema/material.schema.json",
          "pointer": "#/properties/doubleSided",
          "value": false
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/mesh.primitive.schema.json",
      "ref": "origin/main",
      "schemaName": "mesh.primitive.schema.json",
      "id": "mesh.primitive.schema.json",
      "title": "Mesh Primitive",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/mesh.primitive.schema.json",
          "pointer": "#/properties/mode",
          "value": 4
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/mesh.schema.json",
      "ref": "origin/main",
      "schemaName": "mesh.schema.json",
      "id": "mesh.schema.json",
      "title": "Mesh",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/node.schema.json",
      "ref": "origin/main",
      "schemaName": "node.schema.json",
      "id": "node.schema.json",
      "title": "Node",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/node.schema.json",
          "pointer": "#/properties/matrix",
          "value": [
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1
          ]
        },
        {
          "sourceId": "specification/2.0/schema/node.schema.json",
          "pointer": "#/properties/rotation",
          "value": [
            0,
            0,
            0,
            1
          ]
        },
        {
          "sourceId": "specification/2.0/schema/node.schema.json",
          "pointer": "#/properties/scale",
          "value": [
            1,
            1,
            1
          ]
        },
        {
          "sourceId": "specification/2.0/schema/node.schema.json",
          "pointer": "#/properties/translation",
          "value": [
            0,
            0,
            0
          ]
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/sampler.schema.json",
      "ref": "origin/main",
      "schemaName": "sampler.schema.json",
      "id": "sampler.schema.json",
      "title": "Sampler",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/sampler.schema.json",
          "pointer": "#/properties/wrapS",
          "value": 10497
        },
        {
          "sourceId": "specification/2.0/schema/sampler.schema.json",
          "pointer": "#/properties/wrapT",
          "value": 10497
        }
      ]
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/scene.schema.json",
      "ref": "origin/main",
      "schemaName": "scene.schema.json",
      "id": "scene.schema.json",
      "title": "Scene",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/skin.schema.json",
      "ref": "origin/main",
      "schemaName": "skin.schema.json",
      "id": "skin.schema.json",
      "title": "Skin",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/texture.schema.json",
      "ref": "origin/main",
      "schemaName": "texture.schema.json",
      "id": "texture.schema.json",
      "title": "Texture",
      "defaults": []
    },
    {
      "kind": "core",
      "path": "specification/2.0/schema/textureInfo.schema.json",
      "ref": "origin/main",
      "schemaName": "textureInfo.schema.json",
      "id": "textureInfo.schema.json",
      "title": "Texture Info",
      "defaults": [
        {
          "sourceId": "specification/2.0/schema/textureInfo.schema.json",
          "pointer": "#/properties/texCoord",
          "value": 0
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_animation_pointer",
      "path": "extensions/2.0/Khronos/KHR_animation_pointer/schema/animation.channel.target.KHR_animation_pointer.schema.json",
      "ref": "origin/main",
      "schemaName": "animation.channel.target.KHR_animation_pointer.schema.json",
      "title": "KHR_animation_pointer glTF Animation Channel Target Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_draco_mesh_compression",
      "path": "extensions/2.0/Khronos/KHR_draco_mesh_compression/schema/mesh.primitive.KHR_draco_mesh_compression.schema.json",
      "ref": "origin/main",
      "schemaName": "mesh.primitive.KHR_draco_mesh_compression.schema.json",
      "title": "KHR_draco_mesh_compression glTF Mesh Primitive Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_lights_punctual",
      "path": "extensions/2.0/Khronos/KHR_lights_punctual/schema/glTF.KHR_lights_punctual.schema.json",
      "ref": "origin/main",
      "schemaName": "glTF.KHR_lights_punctual.schema.json",
      "title": "KHR_lights_punctual glTF Document Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_lights_punctual",
      "path": "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.schema.json",
      "ref": "origin/main",
      "schemaName": "light.schema.json",
      "title": "KHR_lights_punctual Light Properties",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.schema.json",
          "pointer": "#/properties/color",
          "value": [
            1,
            1,
            1
          ]
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.schema.json",
          "pointer": "#/properties/intensity",
          "value": 1
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_lights_punctual",
      "path": "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.spot.schema.json",
      "ref": "origin/main",
      "schemaName": "light.spot.schema.json",
      "title": "KHR_lights_punctual Light Spot Properties",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.spot.schema.json",
          "pointer": "#/properties/innerConeAngle",
          "value": 0
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.spot.schema.json",
          "pointer": "#/properties/outerConeAngle",
          "value": 0.7853981633974483
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_lights_punctual",
      "path": "extensions/2.0/Khronos/KHR_lights_punctual/schema/node.KHR_lights_punctual.schema.json",
      "ref": "origin/main",
      "schemaName": "node.KHR_lights_punctual.schema.json",
      "title": "KHR_lights_punctual glTF Node Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_anisotropy",
      "path": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_anisotropy.schema.json",
      "title": "KHR_materials_anisotropy glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json",
          "pointer": "#/properties/anisotropyStrength",
          "value": 0
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json",
          "pointer": "#/properties/anisotropyRotation",
          "value": 0
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_clearcoat",
      "path": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_clearcoat.schema.json",
      "title": "KHR_materials_clearcoat glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json",
          "pointer": "#/properties/clearcoatFactor",
          "value": 0
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json",
          "pointer": "#/properties/clearcoatRoughnessFactor",
          "value": 0
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_dispersion",
      "path": "extensions/2.0/Khronos/KHR_materials_dispersion/schema/material.KHR_materials_dispersion.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_dispersion.schema.json",
      "title": "KHR_materials_dispersion glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_dispersion/schema/material.KHR_materials_dispersion.schema.json",
          "pointer": "#/properties/dispersion",
          "value": 0
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_emissive_strength",
      "path": "extensions/2.0/Khronos/KHR_materials_emissive_strength/schema/material.KHR_materials_emissive_strength.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_emissive_strength.schema.json",
      "title": "KHR_materials_emissive_strength glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_emissive_strength/schema/material.KHR_materials_emissive_strength.schema.json",
          "pointer": "#/properties/emissiveStrength",
          "value": 1
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_ior",
      "path": "extensions/2.0/Khronos/KHR_materials_ior/schema/material.KHR_materials_ior.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_ior.schema.json",
      "title": "KHR_materials_ior glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_ior/schema/material.KHR_materials_ior.schema.json",
          "pointer": "#/properties/ior",
          "value": 1.5
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_iridescence",
      "path": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_iridescence.schema.json",
      "title": "KHR_materials_iridescence glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json",
          "pointer": "#/properties/iridescenceFactor",
          "value": 0
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json",
          "pointer": "#/properties/iridescenceIor",
          "value": 1.3
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json",
          "pointer": "#/properties/iridescenceThicknessMinimum",
          "value": 100
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json",
          "pointer": "#/properties/iridescenceThicknessMaximum",
          "value": 400
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_sheen",
      "path": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_sheen.schema.json",
      "title": "KHR_materials_sheen glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json",
          "pointer": "#/properties/sheenColorFactor",
          "value": [
            0,
            0,
            0
          ]
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json",
          "pointer": "#/properties/sheenRoughnessFactor",
          "value": 0
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_specular",
      "path": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_specular.schema.json",
      "title": "KHR_materials_specular glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json",
          "pointer": "#/properties/specularFactor",
          "value": 1
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json",
          "pointer": "#/properties/specularColorFactor",
          "value": [
            1,
            1,
            1
          ]
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_transmission",
      "path": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_transmission.schema.json",
      "title": "KHR_materials_transmission glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json",
          "pointer": "#/properties/transmissionFactor",
          "value": 0
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_unlit",
      "path": "extensions/2.0/Khronos/KHR_materials_unlit/schema/material.KHR_materials_unlit.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_unlit.schema.json",
      "title": "KHR_materials_unlit glTF Material Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_variants",
      "path": "extensions/2.0/Khronos/KHR_materials_variants/schema/glTF.KHR_materials_variants.schema.json",
      "ref": "origin/main",
      "schemaName": "glTF.KHR_materials_variants.schema.json",
      "title": "KHR_materials_variants glTF Document Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_variants",
      "path": "extensions/2.0/Khronos/KHR_materials_variants/schema/mesh.primitive.KHR_materials_variants.schema.json",
      "ref": "origin/main",
      "schemaName": "mesh.primitive.KHR_materials_variants.schema.json",
      "title": "KHR_materials_variants glTF Mesh Primitive Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_materials_volume",
      "path": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json",
      "ref": "origin/main",
      "schemaName": "material.KHR_materials_volume.schema.json",
      "title": "KHR_materials_volume glTF Material Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json",
          "pointer": "#/properties/thicknessFactor",
          "value": 0
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json",
          "pointer": "#/properties/attenuationColor",
          "value": [
            1,
            1,
            1
          ]
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_node_visibility",
      "path": "extensions/2.0/Khronos/KHR_node_visibility/schema/node.KHR_node_visibility.schema.json",
      "ref": "origin/main",
      "schemaName": "node.KHR_node_visibility.schema.json",
      "title": "KHR_node_visibility glTF Node Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_node_visibility/schema/node.KHR_node_visibility.schema.json",
          "pointer": "#/properties/visible",
          "value": true
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_texture_basisu",
      "path": "extensions/2.0/Khronos/KHR_texture_basisu/schema/texture.KHR_texture_basisu.schema.json",
      "ref": "origin/main",
      "schemaName": "texture.KHR_texture_basisu.schema.json",
      "title": "KHR_texture_basisu glTF Texture Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_texture_transform",
      "path": "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json",
      "ref": "origin/main",
      "schemaName": "textureInfo.KHR_texture_transform.schema.json",
      "title": "KHR_texture_transform glTF TextureInfo Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json",
          "pointer": "#/properties/offset",
          "value": [
            0,
            0
          ]
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json",
          "pointer": "#/properties/rotation",
          "value": 0
        },
        {
          "sourceId": "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json",
          "pointer": "#/properties/scale",
          "value": [
            1,
            1
          ]
        }
      ]
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_xmp_json_ld",
      "path": "extensions/2.0/Khronos/KHR_xmp_json_ld/schema/glTF.KHR_xmp_json_ld.schema.json",
      "ref": "origin/main",
      "schemaName": "glTF.KHR_xmp_json_ld.schema.json",
      "title": "KHR_xmp_json_ld glTF Document Extension",
      "defaults": []
    },
    {
      "kind": "ratified-extension",
      "extension": "KHR_xmp_json_ld",
      "path": "extensions/2.0/Khronos/KHR_xmp_json_ld/schema/KHR_xmp_json_ld.schema.json",
      "ref": "origin/main",
      "schemaName": "KHR_xmp_json_ld.schema.json",
      "title": "KHR_xmp_json_ld glTF Extension",
      "defaults": []
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/declaration.KHR_interactivity.schema.json",
      "schemaName": "declaration.KHR_interactivity.schema.json",
      "id": "declaration.KHR_interactivity.schema.json",
      "title": "Behavior graph declaration",
      "defaults": []
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/event.KHR_interactivity.schema.json",
      "schemaName": "event.KHR_interactivity.schema.json",
      "id": "event.KHR_interactivity.schema.json",
      "title": "Behavior graph event",
      "defaults": []
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/glTF.KHR_interactivity.schema.json",
      "schemaName": "glTF.KHR_interactivity.schema.json",
      "id": "glTF.KHR_interactivity.schema.json",
      "title": "KHR_interactivity glTF extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_interactivity/schema/glTF.KHR_interactivity.schema.json",
          "pointer": "#/properties/graph",
          "value": 0
        }
      ]
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/graph.KHR_interactivity.schema.json",
      "schemaName": "graph.KHR_interactivity.schema.json",
      "id": "graph.KHR_interactivity.schema.json",
      "title": "Behavior graph",
      "defaults": []
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/node.KHR_interactivity.schema.json",
      "schemaName": "node.KHR_interactivity.schema.json",
      "id": "node.KHR_interactivity.schema.json",
      "title": "Behavior graph interactivity node",
      "defaults": []
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/type.KHR_interactivity.schema.json",
      "schemaName": "type.KHR_interactivity.schema.json",
      "id": "type.KHR_interactivity.schema.json",
      "title": "Behavior graph type",
      "defaults": []
    },
    {
      "kind": "interactivity-pr",
      "extension": "KHR_interactivity",
      "path": "extensions/2.0/Khronos/KHR_interactivity/schema/variable.KHR_interactivity.schema.json",
      "schemaName": "variable.KHR_interactivity.schema.json",
      "id": "variable.KHR_interactivity.schema.json",
      "title": "Behavior graph variable",
      "defaults": []
    },
    {
      "kind": "draft-extension-pr",
      "extension": "KHR_node_selectability",
      "path": "extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json",
      "ref": "refs/remotes/origin/pr/2422-selectability",
      "schemaName": "node.KHR_node_selectability.schema.json",
      "title": "KHR_node_selectability glTF Node Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json",
          "pointer": "#/properties/selectable",
          "value": true
        }
      ]
    },
    {
      "kind": "draft-extension-pr",
      "extension": "KHR_node_hoverability",
      "path": "extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json",
      "ref": "refs/remotes/origin/pr/2426-hoverability",
      "schemaName": "node.KHR_node_hoverability.schema.json",
      "title": "KHR_node_hoverability glTF Node Extension",
      "defaults": [
        {
          "sourceId": "extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json",
          "pointer": "#/properties/hoverable",
          "value": true
        }
      ]
    }
  ],
  "defaultBySchemaPointer": {
    "specification/2.0/schema/accessor.schema.json#/properties/byteOffset": 0,
    "specification/2.0/schema/accessor.schema.json#/properties/normalized": false,
    "specification/2.0/schema/accessor.sparse.indices.schema.json#/properties/byteOffset": 0,
    "specification/2.0/schema/accessor.sparse.values.schema.json#/properties/byteOffset": 0,
    "specification/2.0/schema/animation.sampler.schema.json#/properties/interpolation": "LINEAR",
    "specification/2.0/schema/bufferView.schema.json#/properties/byteOffset": 0,
    "specification/2.0/schema/material.normalTextureInfo.schema.json#/properties/scale": 1,
    "specification/2.0/schema/material.occlusionTextureInfo.schema.json#/properties/strength": 1,
    "specification/2.0/schema/material.pbrMetallicRoughness.schema.json#/properties/baseColorFactor": [
      1,
      1,
      1,
      1
    ],
    "specification/2.0/schema/material.pbrMetallicRoughness.schema.json#/properties/metallicFactor": 1,
    "specification/2.0/schema/material.pbrMetallicRoughness.schema.json#/properties/roughnessFactor": 1,
    "specification/2.0/schema/material.schema.json#/properties/emissiveFactor": [
      0,
      0,
      0
    ],
    "specification/2.0/schema/material.schema.json#/properties/alphaMode": "OPAQUE",
    "specification/2.0/schema/material.schema.json#/properties/alphaCutoff": 0.5,
    "specification/2.0/schema/material.schema.json#/properties/doubleSided": false,
    "specification/2.0/schema/mesh.primitive.schema.json#/properties/mode": 4,
    "specification/2.0/schema/node.schema.json#/properties/matrix": [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ],
    "specification/2.0/schema/node.schema.json#/properties/rotation": [
      0,
      0,
      0,
      1
    ],
    "specification/2.0/schema/node.schema.json#/properties/scale": [
      1,
      1,
      1
    ],
    "specification/2.0/schema/node.schema.json#/properties/translation": [
      0,
      0,
      0
    ],
    "specification/2.0/schema/sampler.schema.json#/properties/wrapS": 10497,
    "specification/2.0/schema/sampler.schema.json#/properties/wrapT": 10497,
    "specification/2.0/schema/textureInfo.schema.json#/properties/texCoord": 0,
    "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.schema.json#/properties/color": [
      1,
      1,
      1
    ],
    "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.schema.json#/properties/intensity": 1,
    "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.spot.schema.json#/properties/innerConeAngle": 0,
    "extensions/2.0/Khronos/KHR_lights_punctual/schema/light.spot.schema.json#/properties/outerConeAngle": 0.7853981633974483,
    "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyStrength": 0,
    "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyRotation": 0,
    "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatFactor": 0,
    "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessFactor": 0,
    "extensions/2.0/Khronos/KHR_materials_dispersion/schema/material.KHR_materials_dispersion.schema.json#/properties/dispersion": 0,
    "extensions/2.0/Khronos/KHR_materials_emissive_strength/schema/material.KHR_materials_emissive_strength.schema.json#/properties/emissiveStrength": 1,
    "extensions/2.0/Khronos/KHR_materials_ior/schema/material.KHR_materials_ior.schema.json#/properties/ior": 1.5,
    "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceFactor": 0,
    "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceIor": 1.3,
    "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMinimum": 100,
    "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMaximum": 400,
    "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorFactor": [
      0,
      0,
      0
    ],
    "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessFactor": 0,
    "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularFactor": 1,
    "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorFactor": [
      1,
      1,
      1
    ],
    "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionFactor": 0,
    "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessFactor": 0,
    "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationColor": [
      1,
      1,
      1
    ],
    "extensions/2.0/Khronos/KHR_node_visibility/schema/node.KHR_node_visibility.schema.json#/properties/visible": true,
    "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json#/properties/offset": [
      0,
      0
    ],
    "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json#/properties/rotation": 0,
    "extensions/2.0/Khronos/KHR_texture_transform/schema/textureInfo.KHR_texture_transform.schema.json#/properties/scale": [
      1,
      1
    ],
    "extensions/2.0/Khronos/KHR_interactivity/schema/glTF.KHR_interactivity.schema.json#/properties/graph": 0,
    "extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json#/properties/selectable": true,
    "extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json#/properties/hoverable": true
  },
  "materialPointers": [
    {
      "template": "/materials/{}/alphaCutoff",
      "segments": [
        "alphaCutoff"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/alphaCutoff",
      "defaultValue": 0.5
    },
    {
      "template": "/materials/{}/doubleSided",
      "segments": [
        "doubleSided"
      ],
      "typeName": "bool",
      "readOnly": true,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/doubleSided",
      "defaultValue": false
    },
    {
      "template": "/materials/{}/emissiveFactor",
      "segments": [
        "emissiveFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/emissiveFactor",
      "defaultValue": [
        0,
        0,
        0
      ]
    },
    {
      "template": "/materials/{}/emissiveTexture/texCoord",
      "segments": [
        "emissiveTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/emissiveTexture/properties/texCoord",
      "requiredParentSegments": [
        "emissiveTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_anisotropy/anisotropyRotation",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyRotation"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyRotation",
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_anisotropy/anisotropyStrength",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyStrength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyStrength",
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_anisotropy/anisotropyTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatFactor",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatNormalTexture/scale",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatNormalTexture",
        "scale"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatNormalTexture/properties/scale",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatNormalTexture"
      ],
      "defaultValue": 1,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_dispersion/dispersion",
      "segments": [
        "extensions",
        "KHR_materials_dispersion",
        "dispersion"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_dispersion/schema/material.KHR_materials_dispersion.schema.json#/properties/dispersion",
      "defaultValue": 0,
      "extension": "KHR_materials_dispersion"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_emissive_strength/emissiveStrength",
      "segments": [
        "extensions",
        "KHR_materials_emissive_strength",
        "emissiveStrength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_emissive_strength/schema/material.KHR_materials_emissive_strength.schema.json#/properties/emissiveStrength",
      "defaultValue": 1,
      "extension": "KHR_materials_emissive_strength"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_ior/ior",
      "segments": [
        "extensions",
        "KHR_materials_ior",
        "ior"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_ior/schema/material.KHR_materials_ior.schema.json#/properties/ior",
      "defaultValue": 1.5,
      "extension": "KHR_materials_ior"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceFactor",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceIor",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceIor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceIor",
      "defaultValue": 1.3,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceThicknessMaximum",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessMaximum"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMaximum",
      "defaultValue": 400,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceThicknessMinimum",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessMinimum"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMinimum",
      "defaultValue": 100,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceThicknessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenColorFactor",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorFactor",
      "defaultValue": [
        0,
        0,
        0
      ],
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenColorTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenRoughnessFactor",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenRoughnessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularColorFactor",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorFactor",
      "defaultValue": [
        1,
        1,
        1
      ],
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularColorTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularFactor",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularFactor",
      "defaultValue": 1,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_specular",
        "specularTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_transmission/transmissionFactor",
      "segments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_transmission"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_transmission/transmissionTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_transmission"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/attenuationColor",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "attenuationColor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationColor",
      "defaultValue": [
        1,
        1,
        1
      ],
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/attenuationDistance",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "attenuationDistance"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationDistance",
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/thicknessFactor",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/thicknessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/normalTexture/scale",
      "segments": [
        "normalTexture",
        "scale"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/normalTexture/properties/scale",
      "requiredParentSegments": [
        "normalTexture"
      ],
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/occlusionTexture/strength",
      "segments": [
        "occlusionTexture",
        "strength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/occlusionTexture/properties/strength",
      "requiredParentSegments": [
        "occlusionTexture"
      ],
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorFactor",
      "segments": [
        "pbrMetallicRoughness",
        "baseColorFactor"
      ],
      "typeName": "float4",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/baseColorFactor",
      "defaultValue": [
        1,
        1,
        1,
        1
      ]
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorTexture/texCoord",
      "segments": [
        "pbrMetallicRoughness",
        "baseColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/baseColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "pbrMetallicRoughness",
        "baseColorTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicFactor",
      "segments": [
        "pbrMetallicRoughness",
        "metallicFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/metallicFactor",
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicRoughnessTexture/texCoord",
      "segments": [
        "pbrMetallicRoughness",
        "metallicRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/metallicRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "pbrMetallicRoughness",
        "metallicRoughnessTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/roughnessFactor",
      "segments": [
        "pbrMetallicRoughness",
        "roughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/roughnessFactor",
      "defaultValue": 1
    }
  ],
  "nodeExtensionPointers": [
    {
      "template": "/nodes/{}/extensions/KHR_node_hoverability/hoverable",
      "segments": [
        "extensions",
        "KHR_node_hoverability",
        "hoverable"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json#/properties/hoverable",
      "defaultValue": true,
      "extension": "KHR_node_hoverability"
    },
    {
      "template": "/nodes/{}/extensions/KHR_node_selectability/selectable",
      "segments": [
        "extensions",
        "KHR_node_selectability",
        "selectable"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json#/properties/selectable",
      "defaultValue": true,
      "extension": "KHR_node_selectability"
    },
    {
      "template": "/nodes/{}/extensions/KHR_node_visibility/visible",
      "segments": [
        "extensions",
        "KHR_node_visibility",
        "visible"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_visibility/schema/node.KHR_node_visibility.schema.json#/properties/visible",
      "defaultValue": true,
      "extension": "KHR_node_visibility"
    }
  ],
  "objectModelPointers": [
    {
      "template": "/animations.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/animations/[]",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/animations/[]/extensions/KHR_interactivity/isPlaying",
      "typeName": "bool",
      "readOnly": true
    },
    {
      "template": "/animations/[]/extensions/KHR_interactivity/maxTime",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/[]/extensions/KHR_interactivity/minTime",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/[]/extensions/KHR_interactivity/playhead",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/[]/extensions/KHR_interactivity/virtualPlayhead",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/{}",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/animations/{}/extensions/KHR_interactivity/isPlaying",
      "typeName": "bool",
      "readOnly": true
    },
    {
      "template": "/animations/{}/extensions/KHR_interactivity/maxTime",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/{}/extensions/KHR_interactivity/minTime",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/{}/extensions/KHR_interactivity/playhead",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/animations/{}/extensions/KHR_interactivity/virtualPlayhead",
      "typeName": "float",
      "readOnly": true
    },
    {
      "template": "/cameras.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/cameras/[]/orthographic/xmag",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/orthographic/ymag",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/orthographic/zfar",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/orthographic/znear",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/perspective/aspectRatio",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/perspective/yfov",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/perspective/zfar",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/[]/perspective/znear",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/orthographic/xmag",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/orthographic/ymag",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/orthographic/zfar",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/orthographic/znear",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/perspective/aspectRatio",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/perspective/yfov",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/perspective/zfar",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/cameras/{}/perspective/znear",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_interactivity/delays/{}",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/extensions/KHR_interactivity/events/{}",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/[]/color",
      "typeName": "float3",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/[]/intensity",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/[]/range",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/[]/spot/innerConeAngle",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/[]/spot/outerConeAngle",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/{}/color",
      "typeName": "float3",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/{}/intensity",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/{}/range",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/{}/spot/innerConeAngle",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/extensions/KHR_lights_punctual/lights/{}/spot/outerConeAngle",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/materials/[]/alphaCutoff",
      "segments": [
        "alphaCutoff"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/alphaCutoff",
      "defaultValue": 0.5
    },
    {
      "template": "/materials/[]/doubleSided",
      "segments": [
        "doubleSided"
      ],
      "typeName": "bool",
      "readOnly": true,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/doubleSided",
      "defaultValue": false
    },
    {
      "template": "/materials/[]/emissiveFactor",
      "segments": [
        "emissiveFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/emissiveFactor",
      "defaultValue": [
        0,
        0,
        0
      ]
    },
    {
      "template": "/materials/[]/emissiveTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/emissiveTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/[]/emissiveTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/emissiveTexture/texCoord",
      "segments": [
        "emissiveTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/emissiveTexture/properties/texCoord",
      "requiredParentSegments": [
        "emissiveTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_anisotropy/anisotropyRotation",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyRotation"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyRotation",
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_anisotropy/anisotropyStrength",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyStrength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyStrength",
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_anisotropy/anisotropyTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_clearcoat/clearcoatFactor",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_clearcoat/clearcoatNormalTexture/scale",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatNormalTexture",
        "scale"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatNormalTexture/properties/scale",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatNormalTexture"
      ],
      "defaultValue": 1,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_clearcoat/clearcoatTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_dispersion/dispersion",
      "segments": [
        "extensions",
        "KHR_materials_dispersion",
        "dispersion"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_dispersion/schema/material.KHR_materials_dispersion.schema.json#/properties/dispersion",
      "defaultValue": 0,
      "extension": "KHR_materials_dispersion"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_emissive_strength/emissiveStrength",
      "segments": [
        "extensions",
        "KHR_materials_emissive_strength",
        "emissiveStrength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_emissive_strength/schema/material.KHR_materials_emissive_strength.schema.json#/properties/emissiveStrength",
      "defaultValue": 1,
      "extension": "KHR_materials_emissive_strength"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_ior/ior",
      "segments": [
        "extensions",
        "KHR_materials_ior",
        "ior"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_ior/schema/material.KHR_materials_ior.schema.json#/properties/ior",
      "defaultValue": 1.5,
      "extension": "KHR_materials_ior"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_iridescence/iridescenceFactor",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_iridescence/iridescenceIor",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceIor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceIor",
      "defaultValue": 1.3,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_iridescence/iridescenceTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_iridescence/iridescenceThicknessMaximum",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessMaximum"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMaximum",
      "defaultValue": 400,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_iridescence/iridescenceThicknessMinimum",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessMinimum"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMinimum",
      "defaultValue": 100,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_iridescence/iridescenceThicknessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_sheen/sheenColorFactor",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorFactor",
      "defaultValue": [
        0,
        0,
        0
      ],
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_sheen/sheenColorTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_sheen/sheenRoughnessFactor",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_sheen/sheenRoughnessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_specular/specularColorFactor",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorFactor",
      "defaultValue": [
        1,
        1,
        1
      ],
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_specular/specularColorTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_specular/specularFactor",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularFactor",
      "defaultValue": 1,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_specular/specularTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_specular",
        "specularTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_transmission/transmissionFactor",
      "segments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_transmission"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_transmission/transmissionTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_transmission"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_volume/attenuationColor",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "attenuationColor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationColor",
      "defaultValue": [
        1,
        1,
        1
      ],
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_volume/attenuationDistance",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "attenuationDistance"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationDistance",
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_volume/thicknessFactor",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/[]/extensions/KHR_materials_volume/thicknessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/[]/normalTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/normalTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/[]/normalTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/normalTexture/scale",
      "segments": [
        "normalTexture",
        "scale"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/normalTexture/properties/scale",
      "requiredParentSegments": [
        "normalTexture"
      ],
      "defaultValue": 1
    },
    {
      "template": "/materials/[]/occlusionTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/occlusionTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/[]/occlusionTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/occlusionTexture/strength",
      "segments": [
        "occlusionTexture",
        "strength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/occlusionTexture/properties/strength",
      "requiredParentSegments": [
        "occlusionTexture"
      ],
      "defaultValue": 1
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/baseColorFactor",
      "segments": [
        "pbrMetallicRoughness",
        "baseColorFactor"
      ],
      "typeName": "float4",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/baseColorFactor",
      "defaultValue": [
        1,
        1,
        1,
        1
      ]
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/baseColorTexture/texCoord",
      "segments": [
        "pbrMetallicRoughness",
        "baseColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/baseColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "pbrMetallicRoughness",
        "baseColorTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/metallicFactor",
      "segments": [
        "pbrMetallicRoughness",
        "metallicFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/metallicFactor",
      "defaultValue": 1
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/metallicRoughnessTexture/texCoord",
      "segments": [
        "pbrMetallicRoughness",
        "metallicRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/metallicRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "pbrMetallicRoughness",
        "metallicRoughnessTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/[]/pbrMetallicRoughness/roughnessFactor",
      "segments": [
        "pbrMetallicRoughness",
        "roughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/roughnessFactor",
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/alphaCutoff",
      "segments": [
        "alphaCutoff"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/alphaCutoff",
      "defaultValue": 0.5
    },
    {
      "template": "/materials/{}/doubleSided",
      "segments": [
        "doubleSided"
      ],
      "typeName": "bool",
      "readOnly": true,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/doubleSided",
      "defaultValue": false
    },
    {
      "template": "/materials/{}/emissiveFactor",
      "segments": [
        "emissiveFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/emissiveFactor",
      "defaultValue": [
        0,
        0,
        0
      ]
    },
    {
      "template": "/materials/{}/emissiveTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/emissiveTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/{}/emissiveTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/emissiveTexture/texCoord",
      "segments": [
        "emissiveTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/emissiveTexture/properties/texCoord",
      "requiredParentSegments": [
        "emissiveTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_anisotropy/anisotropyRotation",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyRotation"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyRotation",
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_anisotropy/anisotropyStrength",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyStrength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyStrength",
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_anisotropy/anisotropyTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_anisotropy/schema/material.KHR_materials_anisotropy.schema.json#/properties/anisotropyTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_anisotropy",
        "anisotropyTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_anisotropy"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatFactor",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatNormalTexture/scale",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatNormalTexture",
        "scale"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatNormalTexture/properties/scale",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatNormalTexture"
      ],
      "defaultValue": 1,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatRoughnessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_clearcoat/clearcoatTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_clearcoat/schema/material.KHR_materials_clearcoat.schema.json#/properties/clearcoatTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_clearcoat",
        "clearcoatTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_clearcoat"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_dispersion/dispersion",
      "segments": [
        "extensions",
        "KHR_materials_dispersion",
        "dispersion"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_dispersion/schema/material.KHR_materials_dispersion.schema.json#/properties/dispersion",
      "defaultValue": 0,
      "extension": "KHR_materials_dispersion"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_emissive_strength/emissiveStrength",
      "segments": [
        "extensions",
        "KHR_materials_emissive_strength",
        "emissiveStrength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_emissive_strength/schema/material.KHR_materials_emissive_strength.schema.json#/properties/emissiveStrength",
      "defaultValue": 1,
      "extension": "KHR_materials_emissive_strength"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_ior/ior",
      "segments": [
        "extensions",
        "KHR_materials_ior",
        "ior"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_ior/schema/material.KHR_materials_ior.schema.json#/properties/ior",
      "defaultValue": 1.5,
      "extension": "KHR_materials_ior"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceFactor",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceIor",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceIor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceIor",
      "defaultValue": 1.3,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceThicknessMaximum",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessMaximum"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMaximum",
      "defaultValue": 400,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceThicknessMinimum",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessMinimum"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessMinimum",
      "defaultValue": 100,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_iridescence/iridescenceThicknessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_iridescence/schema/material.KHR_materials_iridescence.schema.json#/properties/iridescenceThicknessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_iridescence",
        "iridescenceThicknessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_iridescence"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenColorFactor",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorFactor",
      "defaultValue": [
        0,
        0,
        0
      ],
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenColorTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenColorTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenRoughnessFactor",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_sheen/sheenRoughnessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_sheen/schema/material.KHR_materials_sheen.schema.json#/properties/sheenRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_sheen",
        "sheenRoughnessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_sheen"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularColorFactor",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorFactor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorFactor",
      "defaultValue": [
        1,
        1,
        1
      ],
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularColorTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_specular",
        "specularColorTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularFactor",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularFactor",
      "defaultValue": 1,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_specular/specularTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_specular",
        "specularTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json#/properties/specularTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_specular",
        "specularTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_specular"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_transmission/transmissionFactor",
      "segments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_transmission"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_transmission/transmissionTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_transmission/schema/material.KHR_materials_transmission.schema.json#/properties/transmissionTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_transmission",
        "transmissionTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_transmission"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/attenuationColor",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "attenuationColor"
      ],
      "typeName": "float3",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationColor",
      "defaultValue": [
        1,
        1,
        1
      ],
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/attenuationDistance",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "attenuationDistance"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/attenuationDistance",
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/thicknessFactor",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessFactor",
      "defaultValue": 0,
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/extensions/KHR_materials_volume/thicknessTexture/texCoord",
      "segments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_materials_volume/schema/material.KHR_materials_volume.schema.json#/properties/thicknessTexture/properties/texCoord",
      "requiredParentSegments": [
        "extensions",
        "KHR_materials_volume",
        "thicknessTexture"
      ],
      "defaultValue": 0,
      "extension": "KHR_materials_volume"
    },
    {
      "template": "/materials/{}/normalTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/normalTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/{}/normalTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/normalTexture/scale",
      "segments": [
        "normalTexture",
        "scale"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/normalTexture/properties/scale",
      "requiredParentSegments": [
        "normalTexture"
      ],
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/occlusionTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/occlusionTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/{}/occlusionTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/occlusionTexture/strength",
      "segments": [
        "occlusionTexture",
        "strength"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/occlusionTexture/properties/strength",
      "requiredParentSegments": [
        "occlusionTexture"
      ],
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorFactor",
      "segments": [
        "pbrMetallicRoughness",
        "baseColorFactor"
      ],
      "typeName": "float4",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/baseColorFactor",
      "defaultValue": [
        1,
        1,
        1,
        1
      ]
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/baseColorTexture/texCoord",
      "segments": [
        "pbrMetallicRoughness",
        "baseColorTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/baseColorTexture/properties/texCoord",
      "requiredParentSegments": [
        "pbrMetallicRoughness",
        "baseColorTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicFactor",
      "segments": [
        "pbrMetallicRoughness",
        "metallicFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/metallicFactor",
      "defaultValue": 1
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/offset",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/rotation",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/scale",
      "typeName": "float2",
      "readOnly": false
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/metallicRoughnessTexture/texCoord",
      "segments": [
        "pbrMetallicRoughness",
        "metallicRoughnessTexture",
        "texCoord"
      ],
      "typeName": "int",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/metallicRoughnessTexture/properties/texCoord",
      "requiredParentSegments": [
        "pbrMetallicRoughness",
        "metallicRoughnessTexture"
      ],
      "defaultValue": 0
    },
    {
      "template": "/materials/{}/pbrMetallicRoughness/roughnessFactor",
      "segments": [
        "pbrMetallicRoughness",
        "roughnessFactor"
      ],
      "typeName": "float",
      "readOnly": false,
      "schemaPointer": "specification/2.0/schema/material.schema.json#/properties/pbrMetallicRoughness/properties/roughnessFactor",
      "defaultValue": 1
    },
    {
      "template": "/meshes.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/meshes/[]/primitives.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/meshes/[]/primitives/[]/material",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/meshes/[]/weights.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/meshes/[]/weights/[]",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/meshes/{}/primitives.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/meshes/{}/primitives/[]/material",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/meshes/{}/weights.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/meshes/{}/weights/[]",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/nodes.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/camera",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/children.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/children/[]",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/extensions/KHR_lights_punctual/light",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/extensions/KHR_node_hoverability/hoverable",
      "segments": [
        "extensions",
        "KHR_node_hoverability",
        "hoverable"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json#/properties/hoverable",
      "defaultValue": true,
      "extension": "KHR_node_hoverability"
    },
    {
      "template": "/nodes/[]/extensions/KHR_node_selectability/selectable",
      "segments": [
        "extensions",
        "KHR_node_selectability",
        "selectable"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json#/properties/selectable",
      "defaultValue": true,
      "extension": "KHR_node_selectability"
    },
    {
      "template": "/nodes/[]/extensions/KHR_node_visibility/visible",
      "segments": [
        "extensions",
        "KHR_node_visibility",
        "visible"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_visibility/schema/node.KHR_node_visibility.schema.json#/properties/visible",
      "defaultValue": true,
      "extension": "KHR_node_visibility"
    },
    {
      "template": "/nodes/[]/globalMatrix",
      "typeName": "float4x4",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/matrix",
      "typeName": "float4x4",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/mesh",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/parent",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/rotation",
      "typeName": "float4",
      "readOnly": false
    },
    {
      "template": "/nodes/[]/scale",
      "typeName": "float3",
      "readOnly": false
    },
    {
      "template": "/nodes/[]/skin",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/translation",
      "typeName": "float3",
      "readOnly": false
    },
    {
      "template": "/nodes/[]/weights",
      "typeName": "float[]",
      "readOnly": false
    },
    {
      "template": "/nodes/[]/weights.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/nodes/[]/weights/[]",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/nodes/{}/camera",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/children.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/children/[]",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/extensions/KHR_lights_punctual/light",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/extensions/KHR_node_hoverability/hoverable",
      "segments": [
        "extensions",
        "KHR_node_hoverability",
        "hoverable"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json#/properties/hoverable",
      "defaultValue": true,
      "extension": "KHR_node_hoverability"
    },
    {
      "template": "/nodes/{}/extensions/KHR_node_selectability/selectable",
      "segments": [
        "extensions",
        "KHR_node_selectability",
        "selectable"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json#/properties/selectable",
      "defaultValue": true,
      "extension": "KHR_node_selectability"
    },
    {
      "template": "/nodes/{}/extensions/KHR_node_visibility/visible",
      "segments": [
        "extensions",
        "KHR_node_visibility",
        "visible"
      ],
      "typeName": "bool",
      "readOnly": false,
      "schemaPointer": "extensions/2.0/Khronos/KHR_node_visibility/schema/node.KHR_node_visibility.schema.json#/properties/visible",
      "defaultValue": true,
      "extension": "KHR_node_visibility"
    },
    {
      "template": "/nodes/{}/globalMatrix",
      "typeName": "float4x4",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/matrix",
      "typeName": "float4x4",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/mesh",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/parent",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/rotation",
      "typeName": "float4",
      "readOnly": false
    },
    {
      "template": "/nodes/{}/scale",
      "typeName": "float3",
      "readOnly": false
    },
    {
      "template": "/nodes/{}/skin",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/translation",
      "typeName": "float3",
      "readOnly": false
    },
    {
      "template": "/nodes/{}/weights",
      "typeName": "float[]",
      "readOnly": false
    },
    {
      "template": "/nodes/{}/weights.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/nodes/{}/weights/[]",
      "typeName": "float",
      "readOnly": false
    },
    {
      "template": "/scene",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/scenes.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/scenes/[]/nodes.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/scenes/[]/nodes/[]",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/skins.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/skins/[]/joints.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/skins/[]/joints/[]",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/skins/[]/skeleton",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/skins/{}/joints.length",
      "typeName": "int",
      "readOnly": true
    },
    {
      "template": "/skins/{}/joints/[]",
      "typeName": "ref",
      "readOnly": true
    },
    {
      "template": "/skins/{}/skeleton",
      "typeName": "ref",
      "readOnly": true
    }
  ]
};

// vendor/khronos-interactivity/objectModel/glTFReference.ts
function glTFObjectReference(collectionPath, index) {
  return `/${collectionPath}/${index}`;
}

// vendor/khronos-interactivity/objectModel/glTFAccessors.ts
function readAccessorComponents(gltf, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  const bufferView = gltf.bufferViews?.[accessor?.bufferView];
  const buffers = gltf.__glbBuffers;
  const buffer = buffers?.[bufferView?.buffer ?? 0];
  if (accessor === void 0 || bufferView === void 0 || buffer === void 0) {
    return [];
  }
  const componentCount = accessorComponentCount(accessor.type);
  const componentByteLength = accessorComponentByteLength(accessor.componentType);
  const byteStride = bufferView.byteStride ?? componentCount * componentByteLength;
  const accessorByteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(buffer);
  const values = [];
  for (let elementIndex = 0; elementIndex < accessor.count; elementIndex++) {
    const elementOffset = accessorByteOffset + elementIndex * byteStride;
    const element = [];
    for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) {
      const componentOffset = elementOffset + componentIndex * componentByteLength;
      element.push(readAccessorComponent(view, componentOffset, accessor.componentType, accessor.normalized === true));
    }
    values.push(element);
  }
  applySparseAccessorValues(values, gltf, accessor);
  return values;
}
function applySparseAccessorValues(values, gltf, accessor) {
  const sparse = accessor.sparse;
  if (sparse === void 0 || sparse.count === 0) {
    return;
  }
  const indices = readSparseIndices(gltf, sparse);
  const sparseValues = readSparseValues(gltf, sparse, accessor);
  indices.forEach((targetIndex, sparseIndex) => {
    values[targetIndex] = sparseValues[sparseIndex];
  });
}
function readSparseIndices(gltf, sparse) {
  const bufferView = gltf.bufferViews?.[sparse.indices.bufferView];
  const buffer = gltf.__glbBuffers?.[bufferView?.buffer ?? 0];
  if (bufferView === void 0 || buffer === void 0) {
    return [];
  }
  const componentByteLength = accessorComponentByteLength(sparse.indices.componentType);
  const byteOffset = (bufferView.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
  const view = new DataView(buffer);
  return new Array(sparse.count).fill(0).map((_value, index) => readAccessorComponent(view, byteOffset + index * componentByteLength, sparse.indices.componentType, false));
}
function readSparseValues(gltf, sparse, accessor) {
  const bufferView = gltf.bufferViews?.[sparse.values.bufferView];
  const buffer = gltf.__glbBuffers?.[bufferView?.buffer ?? 0];
  if (bufferView === void 0 || buffer === void 0) {
    return [];
  }
  const componentCount = accessorComponentCount(accessor.type);
  const componentByteLength = accessorComponentByteLength(accessor.componentType);
  const byteStride = bufferView.byteStride ?? componentCount * componentByteLength;
  const byteOffset = (bufferView.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
  const view = new DataView(buffer);
  return new Array(sparse.count).fill(0).map((_value, elementIndex) => new Array(componentCount).fill(0).map((_component, componentIndex) => readAccessorComponent(view, byteOffset + elementIndex * byteStride + componentIndex * componentByteLength, accessor.componentType, accessor.normalized === true)));
}
function accessorComponentCount(type) {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
    default:
      return 0;
  }
}
function accessorComponentByteLength(componentType) {
  switch (componentType) {
    case 5120:
    case 5121:
      return 1;
    case 5122:
    case 5123:
      return 2;
    case 5125:
    case 5126:
      return 4;
    default:
      return 0;
  }
}
function readAccessorComponent(view, byteOffset, componentType, normalized) {
  switch (componentType) {
    case 5120: {
      const value = view.getInt8(byteOffset);
      return normalized ? Math.max(value / 127, -1) : value;
    }
    case 5121: {
      const value = view.getUint8(byteOffset);
      return normalized ? value / 255 : value;
    }
    case 5122: {
      const value = view.getInt16(byteOffset, true);
      return normalized ? Math.max(value / 32767, -1) : value;
    }
    case 5123: {
      const value = view.getUint16(byteOffset, true);
      return normalized ? value / 65535 : value;
    }
    case 5125:
      return view.getUint32(byteOffset, true);
    case 5126:
      return view.getFloat32(byteOffset, true);
    default:
      return NaN;
  }
}

// vendor/khronos-interactivity/objectModel/glTFAnimation.ts
function createObjectModelAnimation(animation, gltf) {
  if (animation.runtimeChannels !== void 0) {
    return {
      ...cloneValue(animation),
      runtimeChannels: cloneValue(animation.runtimeChannels),
      playhead: animation.playhead ?? 0,
      virtualPlayhead: animation.virtualPlayhead ?? 0,
      minTime: animation.minTime,
      maxTime: animation.maxTime,
      isPlaying: animation.isPlaying ?? false
    };
  }
  const runtimeChannels = createRuntimeAnimationChannels(animation, gltf);
  const inputTimes = runtimeChannels.flatMap((channel) => channel.input);
  const minTime = inputTimes.length > 0 ? Math.min(...inputTimes) : NaN;
  const maxTime = inputTimes.length > 0 ? Math.max(...inputTimes) : NaN;
  return {
    ...cloneValue(animation),
    runtimeChannels,
    playhead: 0,
    virtualPlayhead: 0,
    minTime,
    maxTime,
    isPlaying: false
  };
}
function effectiveAnimationTime(animation, requestedTime) {
  const maxTime = Number(animation.maxTime);
  if (!Number.isFinite(maxTime) || maxTime === 0) {
    return 0;
  }
  const iteration = requestedTime > 0 ? Math.ceil((requestedTime - maxTime) / maxTime) : Math.floor(requestedTime / maxTime);
  return requestedTime - iteration * maxTime;
}
function sampleAnimationChannel(channel, time) {
  const times = channel.input;
  if (times.length === 0) {
    return [];
  }
  if (time <= times[0]) {
    return animationOutputValue(channel, 0);
  }
  const lastIndex = times.length - 1;
  if (time >= times[lastIndex]) {
    return animationOutputValue(channel, lastIndex);
  }
  const nextIndex = times.findIndex((nextTime) => nextTime > time);
  const previousIndex = Math.max(0, nextIndex - 1);
  if (channel.interpolation === "STEP") {
    return animationOutputValue(channel, previousIndex);
  }
  const t0 = times[previousIndex];
  const t1 = times[nextIndex];
  const ratio = (time - t0) / (t1 - t0);
  if (channel.interpolation === "CUBICSPLINE") {
    return cubicSplineAnimationValue(channel, previousIndex, nextIndex, ratio, t1 - t0);
  }
  if (channel.targetPath === "rotation") {
    return normalizeQuaternion(slerp(animationOutputValue(channel, previousIndex), animationOutputValue(channel, nextIndex), ratio));
  }
  return interpolateArray(animationOutputValue(channel, previousIndex), animationOutputValue(channel, nextIndex), ratio);
}
function createRuntimeAnimationChannels(animation, gltf) {
  return (animation.channels ?? []).flatMap((channel) => {
    const sampler = animation.samplers?.[channel.sampler];
    const target = channel.target;
    if (sampler === void 0 || target?.node === void 0 || target?.path === void 0) {
      return [];
    }
    const input = readAccessorComponents(gltf, sampler.input).map((value) => Number(value[0]));
    const output = readAccessorComponents(gltf, sampler.output);
    if (input.length === 0 || output.length === 0) {
      return [];
    }
    return [{
      targetNode: target.node,
      targetPath: target.path,
      interpolation: sampler.interpolation ?? "LINEAR",
      input,
      output
    }];
  });
}
function animationOutputValue(channel, keyframeIndex) {
  if (channel.interpolation === "CUBICSPLINE") {
    return [...channel.output[keyframeIndex * 3 + 1]];
  }
  return [...channel.output[keyframeIndex]];
}
function cubicSplineAnimationValue(channel, previousIndex, nextIndex, ratio, duration) {
  const previousValue = channel.output[previousIndex * 3 + 1];
  const previousOutTangent = channel.output[previousIndex * 3 + 2];
  const nextInTangent = channel.output[nextIndex * 3];
  const nextValue = channel.output[nextIndex * 3 + 1];
  const t2 = ratio * ratio;
  const t3 = t2 * ratio;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + ratio;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const value = previousValue.map((_component, index) => h00 * previousValue[index] + h10 * duration * previousOutTangent[index] + h01 * nextValue[index] + h11 * duration * nextInTangent[index]);
  return channel.targetPath === "rotation" ? normalizeQuaternion(value) : value;
}
function interpolateArray(a, b, ratio) {
  return a.map((value, index) => value + (b[index] - value) * ratio);
}
function slerp(a, b, ratio) {
  let bx = b[0];
  let by = b[1];
  let bz = b[2];
  let bw = b[3];
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (cos > 0.9995) {
    return interpolateArray(a, [bx, by, bz, bw], ratio);
  }
  const theta = Math.acos(Math.min(1, Math.max(-1, cos)));
  const sinTheta = Math.sin(theta);
  const scaleA = Math.sin((1 - ratio) * theta) / sinTheta;
  const scaleB = Math.sin(ratio * theta) / sinTheta;
  return [
    a[0] * scaleA + bx * scaleB,
    a[1] * scaleA + by * scaleB,
    a[2] * scaleA + bz * scaleB,
    a[3] * scaleA + bw * scaleB
  ];
}
function normalizeQuaternion(value) {
  const length = Math.hypot(value[0], value[1], value[2], value[3]);
  if (length === 0 || !Number.isFinite(length)) {
    return [0, 0, 0, 1];
  }
  return value.map((component) => component / length);
}
function cloneValue(value) {
  if (value === void 0) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)]));
}

// vendor/khronos-interactivity/diagnostics.ts
var SUPPORTED_GLTF_EXTENSIONS = /* @__PURE__ */ new Set([
  // interactivity related
  "KHR_interactivity",
  "KHR_node_visibility",
  "KHR_node_selectability",
  "KHR_node_hoverability",
  "KHR_physics_rigid_bodies",
  // materials / textures handled by the renderers
  "KHR_materials_emissive_strength",
  "KHR_materials_transmission",
  "KHR_materials_unlit",
  "KHR_materials_clearcoat",
  "KHR_materials_ior",
  "KHR_materials_sheen",
  "KHR_materials_specular",
  "KHR_materials_volume",
  "KHR_materials_iridescence",
  "KHR_materials_anisotropy",
  "KHR_materials_dispersion",
  "KHR_materials_variants",
  "KHR_texture_transform",
  "KHR_texture_basisu",
  "KHR_lights_punctual",
  "KHR_animation_pointer",
  // geometry / compression
  "KHR_draco_mesh_compression",
  "KHR_mesh_quantization",
  "EXT_meshopt_compression",
  "EXT_texture_webp"
]);

// vendor/khronos-interactivity/objectModel/assetCapabilities.ts
var ASSET_EXTENSION_ENABLED_RE = /^\/extensions\/KHR_interactivity\/asset\/extensions\/([^/]+)\/enabled$/;
function parseGltfVersion(version) {
  const [major, minor] = String(version ?? "2.0").split(".").map((part) => Number.parseInt(part, 10));
  return [Number.isFinite(major) ? major : 2, Number.isFinite(minor) ? minor : 0];
}
var KHR_INTERACTIVITY_LIMITS = [
  { name: "maxActiveAnimations", value: 2147483647 },
  { name: "maxActiveDelays", value: 2147483647 },
  { name: "maxActivePropertyInterpolations", value: 2147483647 },
  { name: "maxActiveVariableInterpolations", value: 2147483647 }
];
function assetExtensionEnabled(path, extensionsUsed) {
  const match = ASSET_EXTENSION_ENABLED_RE.exec(path);
  if (match === null) {
    return void 0;
  }
  const extensionName = match[1];
  return extensionsUsed.includes(extensionName) && SUPPORTED_GLTF_EXTENSIONS.has(extensionName);
}

// vendor/khronos-interactivity/objectModel/glTFBinary.ts
var GLB_MAGIC = 1179937895;
var GLB_VERSION = 2;
var JSON_CHUNK_TYPE = 1313821514;
function readGlbJsonFromArrayBuffer(buffer) {
  const view = new DataView(buffer);
  validateGlbHeader(view);
  let offset = 12;
  let json;
  const buffers = [];
  while (offset < view.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    if (chunkType === JSON_CHUNK_TYPE) {
      const jsonBytes = new Uint8Array(buffer, offset + 8, chunkLength);
      json = JSON.parse(new TextDecoder().decode(jsonBytes).trim());
    } else if (chunkType === 5130562) {
      const chunk = buffer.slice(offset + 8, offset + 8 + chunkLength);
      buffers.push(chunk);
    }
    offset += 8 + chunkLength;
  }
  if (json === void 0) {
    throw new Error("GLB file does not contain a JSON chunk");
  }
  Object.defineProperty(json, "__glbBuffers", {
    value: buffers,
    enumerable: false
  });
  return json;
}
function validateGlbHeader(view) {
  if (view.byteLength < 12 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error("File is not a GLB file");
  }
  if (view.getUint32(4, true) !== GLB_VERSION) {
    throw new Error("Only GLB version 2 is supported");
  }
  if (view.getUint32(8, true) !== view.byteLength) {
    throw new Error("GLB header length does not match the file length");
  }
}

// vendor/khronos-interactivity/objectModel/glTFObjectModel.ts
var SCHEMA_DEFAULTS = glTFSchemaMetadata.defaultBySchemaPointer;
var MATERIAL_POINTERS = glTFSchemaMetadata.materialPointers;
var NODE_EXTENSION_POINTERS = glTFSchemaMetadata.nodeExtensionPointers;
var schemaDefault = (schemaPath, propertyPath, fallback) => cloneValue2(SCHEMA_DEFAULTS[`${schemaPath}#/properties/${propertyPath}`] ?? fallback);
var KHR = "extensions/2.0/Khronos";
var GlTFObjectModelDecorator = class extends ADecorator {
  objectModel;
  pointerBindings = /* @__PURE__ */ new Map();
  activeAnimations = /* @__PURE__ */ new Map();
  animationToken = 0;
  constructor(behaveEngine, objectModel = {}) {
    super(behaveEngine);
    this.objectModel = completeGlTFObjectModel(objectModel);
    this.bridgeObjectModelHooks();
    this.bridgeEngineHooks();
    this.registerKnownPointers();
  }
  resolveRef = (ref) => {
    if (ref == null || ref === "") {
      return -1;
    }
    const parts = String(ref).split("/").filter(Boolean);
    return parts.length === 0 ? -1 : parts[parts.length - 1];
  };
  processNodeStarted = (_node) => void 0;
  processAddingNodeToQueue = (_flow) => void 0;
  processExecutingNextNode = (_flow) => void 0;
  startAnimation = (animationIndex, startTime, endTime, speed, callback) => {
    this.clearActiveAnimation(animationIndex);
    const animation = this.objectModel.animations[animationIndex];
    animation.isPlaying = true;
    animation.virtualPlayhead = startTime;
    animation.playhead = effectiveAnimationTime(animation, startTime);
    this.applyAnimation(animationIndex, startTime);
    const duration = Math.abs(endTime - startTime) / speed;
    const token = ++this.animationToken;
    const timeout = Number.isFinite(duration) ? setTimeout(() => {
      if (this.activeAnimations.get(animationIndex)?.token !== token) {
        return;
      }
      animation.isPlaying = false;
      animation.virtualPlayhead = endTime;
      animation.playhead = effectiveAnimationTime(animation, endTime);
      this.applyAnimation(animationIndex, endTime);
      this.activeAnimations.delete(animationIndex);
      callback();
    }, Math.max(0, duration * 1e3)) : null;
    this.activeAnimations.set(animationIndex, { timeout, startTime, endTime, speed, startedAt: performance.now(), token });
  };
  stopAnimation = (animationIndex) => {
    const animation = this.objectModel.animations[animationIndex];
    const currentTime = this.currentAnimationTime(animationIndex);
    this.clearActiveAnimation(animationIndex);
    if (animation !== void 0) {
      animation.isPlaying = false;
      animation.virtualPlayhead = currentTime;
      animation.playhead = effectiveAnimationTime(animation, currentTime);
      this.applyAnimation(animationIndex, currentTime);
    }
  };
  stopAnimationAt = (animationIndex, stopTime, callback) => {
    const activeAnimation = this.activeAnimations.get(animationIndex);
    const animation = this.objectModel.animations[animationIndex];
    if (activeAnimation === void 0 || animation === void 0) {
      return;
    }
    if (activeAnimation.timeout !== null) {
      clearTimeout(activeAnimation.timeout);
    }
    const currentTime = this.currentAnimationTime(animationIndex);
    const remainingSeconds = Math.max(0, Math.abs(stopTime - currentTime) / activeAnimation.speed);
    const token = ++this.animationToken;
    const timeout = setTimeout(() => {
      if (this.activeAnimations.get(animationIndex)?.token !== token) {
        return;
      }
      animation.isPlaying = false;
      animation.virtualPlayhead = stopTime;
      animation.playhead = effectiveAnimationTime(animation, stopTime);
      this.applyAnimation(animationIndex, stopTime);
      this.activeAnimations.delete(animationIndex);
      callback();
    }, remainingSeconds * 1e3);
    this.activeAnimations.set(animationIndex, { ...activeAnimation, timeout, token });
  };
  getWorld = () => this.objectModel;
  getParentNodeIndex = (nodeIndex) => this.objectModel.parents[nodeIndex];
  registerKnownPointers = () => {
    this.registerScenePointers();
    this.registerNodePointers();
    this.registerMeshPointers();
    this.registerMaterialPointers();
    this.registerCameraPointers();
    this.registerSkinPointers();
    this.registerLightPointers();
    this.registerAnimationPointers();
    this.registerInteractivityEventPointers();
    this.registerAssetCapabilityPointers();
  };
  bridgeObjectModelHooks() {
    this.behaveEngine.isValidJsonPtr = this.isValidJsonPtr;
    this.behaveEngine.isReadOnly = this.isReadOnly;
    this.behaveEngine.getPathValue = this.getPathValue;
    this.behaveEngine.getPathTypeName = this.getPathTypeName;
    this.behaveEngine.setPathValue = this.setPathValue;
    this.behaveEngine.getRegisteredJsonPointers = this.getRegisteredJsonPointers;
  }
  isValidJsonPtr = (path) => this.pointerBindings.has(path) || this.assetExtensionEnabled(path) !== void 0 || this.isActiveDelayRef(path);
  isReadOnly = (path) => {
    const binding = this.pointerBindings.get(path);
    if (binding !== void 0) {
      return binding.readOnly;
    }
    return this.assetExtensionEnabled(path) !== void 0 || this.isActiveDelayRef(path);
  };
  getPathValue = (path) => {
    this.updateActiveAnimations();
    const binding = this.pointerBindings.get(path);
    if (binding !== void 0) {
      return binding.get();
    }
    const enabled = this.assetExtensionEnabled(path);
    if (enabled !== void 0) {
      return [enabled];
    }
    return this.isActiveDelayRef(path) ? [path] : void 0;
  };
  getPathTypeName = (path) => {
    const binding = this.pointerBindings.get(path);
    if (binding !== void 0) {
      return binding.typeName;
    }
    if (this.assetExtensionEnabled(path) !== void 0) {
      return "bool";
    }
    return this.isActiveDelayRef(path) ? "ref" : void 0;
  };
  assetExtensionEnabled = (path) => assetExtensionEnabled(path, this.objectModel.extensionsUsed);
  setPathValue = (path, value) => {
    const binding = this.pointerBindings.get(path);
    if (binding && !binding.readOnly) {
      binding.set(value);
    }
  };
  getRegisteredJsonPointers = () => [...this.pointerBindings.keys()].sort();
  setPointerInterpolationCallback(path, action) {
    this.behaveEngine.setPointerInterpolationCallback(path, action);
  }
  clearPointerInterpolation(path) {
    this.behaveEngine.clearPointerInterpolation(path);
  }
  pointer(path, typeName, get, set = ignoreSet, readOnly = false) {
    this.pointerBindings.set(path, { get, set, typeName, readOnly });
    this.registerJsonPointer(path, () => this.getPathValue(path), (_path, value) => this.setPathValue(path, value), typeName, readOnly);
  }
  scalarPointer(path, typeName, get, set = ignoreSet, readOnly = false) {
    this.pointer(path, typeName, () => [get()], (value) => set(scalar(value)), readOnly);
  }
  generatedPointer(target, concretePath, definition) {
    const segments = [...definition.segments];
    const defaultValue = Object.prototype.hasOwnProperty.call(definition, "defaultValue") ? definition.defaultValue : void 0;
    const get = () => getDefaulted(target, segments, defaultValue);
    const set = (value) => setPath(target, segments, isScalarType(definition.typeName) ? scalar(value) : vector(value));
    if (isScalarType(definition.typeName)) {
      this.scalarPointer(concretePath, definition.typeName, get, set, definition.readOnly);
      return;
    }
    this.pointer(concretePath, definition.typeName, get, set, definition.readOnly);
  }
  registerScenePointers() {
    this.scalarPointer("/animations.length", "int", () => this.objectModel.animations.length, ignoreSet, true);
    this.scalarPointer("/cameras.length", "int", () => this.objectModel.cameras.length, ignoreSet, true);
    this.scalarPointer("/materials.length", "int", () => this.objectModel.materials.length, ignoreSet, true);
    this.scalarPointer("/meshes.length", "int", () => this.objectModel.meshes.length, ignoreSet, true);
    this.scalarPointer("/nodes.length", "int", () => this.objectModel.nodes.length, ignoreSet, true);
    this.scalarPointer("/scene", "int", () => this.objectModel.scene, ignoreSet, true);
    this.scalarPointer("/scenes.length", "int", () => this.objectModel.scenes.length, ignoreSet, true);
    this.scalarPointer("/skins.length", "int", () => this.objectModel.skins.length, ignoreSet, true);
    this.objectModel.scenes.forEach((scene, sceneIndex) => {
      const nodes = scene.nodes ?? [];
      this.scalarPointer(`/scenes/${sceneIndex}/nodes.length`, "int", () => nodes.length, ignoreSet, true);
      nodes.forEach((nodeIndex, childIndex) => {
        this.pointer(`/scenes/${sceneIndex}/nodes/${childIndex}`, "ref", () => [glTFObjectReference("nodes", nodeIndex)], ignoreSet, true);
      });
    });
  }
  registerNodePointers() {
    this.objectModel.nodes.forEach((node, nodeIndex) => {
      this.pointer(`/nodes/${nodeIndex}/translation`, "float3", () => node.translation, (value) => node.translation = vector(value));
      if (node.matrix === void 0) {
        this.pointer(`/nodes/${nodeIndex}/rotation`, "float4", () => node.rotation, (value) => node.rotation = vector(value));
        this.pointer(`/nodes/${nodeIndex}/scale`, "float3", () => node.scale, (value) => node.scale = vector(value));
      }
      this.pointer(`/nodes/${nodeIndex}/matrix`, "float4x4", () => this.localMatrix(nodeIndex), ignoreSet, true);
      this.pointer(`/nodes/${nodeIndex}/globalMatrix`, "float4x4", () => this.globalMatrix(nodeIndex), ignoreSet, true);
      this.scalarPointer(`/nodes/${nodeIndex}/children.length`, "int", () => node.children.length, ignoreSet, true);
      node.children.forEach((childNodeIndex, childIndex) => {
        this.pointer(`/nodes/${nodeIndex}/children/${childIndex}`, "ref", () => [glTFObjectReference("nodes", childNodeIndex)], ignoreSet, true);
      });
      if (node.mesh !== void 0) {
        this.pointer(`/nodes/${nodeIndex}/mesh`, "ref", () => [glTFObjectReference("meshes", node.mesh)], ignoreSet, true);
      }
      if (node.camera !== void 0) {
        this.pointer(`/nodes/${nodeIndex}/camera`, "ref", () => [glTFObjectReference("cameras", node.camera)], ignoreSet, true);
      }
      if (node.skin !== void 0) {
        this.pointer(`/nodes/${nodeIndex}/skin`, "ref", () => [glTFObjectReference("skins", node.skin)], ignoreSet, true);
      }
      if (this.objectModel.parents[nodeIndex] !== void 0) {
        this.pointer(`/nodes/${nodeIndex}/parent`, "ref", () => [glTFObjectReference("nodes", this.objectModel.parents[nodeIndex])], ignoreSet, true);
      }
      if (node.weights.length > 0) {
        this.pointer(`/nodes/${nodeIndex}/weights`, "float[]", () => node.weights, (value) => node.weights = vector(value));
        node.weights.forEach((_weight, weightIndex) => {
          this.scalarPointer(`/nodes/${nodeIndex}/weights/${weightIndex}`, "float", () => node.weights[weightIndex], (value) => node.weights[weightIndex] = value);
        });
      }
      if (node.mesh !== void 0) {
        this.scalarPointer(`/nodes/${nodeIndex}/weights.length`, "int", () => node.weights.length, ignoreSet, true);
      }
      for (const pointerDefinition of NODE_EXTENSION_POINTERS) {
        if (node.extensions?.[pointerDefinition.extension ?? ""] === void 0) {
          continue;
        }
        this.generatedPointer(node, pointerDefinition.template.replace("{}", String(nodeIndex)), pointerDefinition);
      }
      if (node.extensions?.KHR_lights_punctual?.light !== void 0) {
        this.pointer(`/nodes/${nodeIndex}/extensions/KHR_lights_punctual/light`, "ref", () => [glTFObjectReference("extensions/KHR_lights_punctual/lights", node.extensions.KHR_lights_punctual.light)], ignoreSet, true);
      }
    });
  }
  registerMeshPointers() {
    this.objectModel.meshes.forEach((mesh, meshIndex) => {
      this.scalarPointer(`/meshes/${meshIndex}/primitives.length`, "int", () => mesh.primitives.length, ignoreSet, true);
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        if (primitive.material !== void 0) {
          this.pointer(`/meshes/${meshIndex}/primitives/${primitiveIndex}/material`, "ref", () => [glTFObjectReference("materials", primitive.material)], ignoreSet, true);
        }
      });
      if (mesh.weights.length > 0) {
        mesh.weights.forEach((_weight, weightIndex) => {
          this.scalarPointer(`/meshes/${meshIndex}/weights/${weightIndex}`, "float", () => mesh.weights[weightIndex], (value) => mesh.weights[weightIndex] = value);
        });
      }
      this.scalarPointer(`/meshes/${meshIndex}/weights.length`, "int", () => mesh.weights.length, ignoreSet, true);
    });
  }
  registerMaterialPointers() {
    this.objectModel.materials.forEach((material, materialIndex) => {
      for (const pointerDefinition of MATERIAL_POINTERS) {
        if (pointerDefinition.extension && material.extensions?.[pointerDefinition.extension] === void 0) {
          continue;
        }
        if (pointerDefinition.requiredParentSegments && getPath(material, [...pointerDefinition.requiredParentSegments]) === void 0) {
          continue;
        }
        this.generatedPointer(material, pointerDefinition.template.replace("{}", String(materialIndex)), pointerDefinition);
      }
      this.registerTextureTransformPointers(material, materialIndex);
    });
  }
  registerTextureTransformPointers(material, materialIndex) {
    for (const texturePath of textureInfoPaths(material)) {
      const textureInfo = getPath(material, texturePath.split("/"));
      if (textureInfo === void 0) {
        continue;
      }
      const transformPath = [...texturePath.split("/"), "extensions", "KHR_texture_transform"];
      this.pointer(`/materials/${materialIndex}/${texturePath}/extensions/KHR_texture_transform/offset`, "float2", () => getDefaulted(material, [...transformPath, "offset"], textureTransformDefault("offset", [0, 0])), (value) => setPath(material, [...transformPath, "offset"], vector(value)));
      this.pointer(`/materials/${materialIndex}/${texturePath}/extensions/KHR_texture_transform/scale`, "float2", () => getDefaulted(material, [...transformPath, "scale"], textureTransformDefault("scale", [1, 1])), (value) => setPath(material, [...transformPath, "scale"], vector(value)));
      this.scalarPointer(`/materials/${materialIndex}/${texturePath}/extensions/KHR_texture_transform/rotation`, "float", () => getDefaulted(material, [...transformPath, "rotation"], textureTransformDefault("rotation", 0)), (value) => setPath(material, [...transformPath, "rotation"], value));
    }
  }
  registerCameraPointers() {
    this.objectModel.cameras.forEach((camera, cameraIndex) => {
      if (camera.perspective) {
        for (const propertyName of ["aspectRatio", "yfov", "zfar", "znear"]) {
          if (camera.perspective[propertyName] !== void 0) {
            this.scalarPointer(`/cameras/${cameraIndex}/perspective/${propertyName}`, "float", () => camera.perspective[propertyName], (value) => camera.perspective[propertyName] = value);
          }
        }
      }
      if (camera.orthographic) {
        for (const propertyName of ["xmag", "ymag", "zfar", "znear"]) {
          if (camera.orthographic[propertyName] !== void 0) {
            this.scalarPointer(`/cameras/${cameraIndex}/orthographic/${propertyName}`, "float", () => camera.orthographic[propertyName], (value) => camera.orthographic[propertyName] = value);
          }
        }
      }
    });
  }
  registerSkinPointers() {
    this.objectModel.skins.forEach((skin, skinIndex) => {
      const joints = skin.joints ?? [];
      this.scalarPointer(`/skins/${skinIndex}/joints.length`, "int", () => joints.length, ignoreSet, true);
      joints.forEach((jointIndex, index) => {
        this.pointer(`/skins/${skinIndex}/joints/${index}`, "ref", () => [glTFObjectReference("nodes", jointIndex)], ignoreSet, true);
      });
      if (skin.skeleton !== void 0) {
        this.pointer(`/skins/${skinIndex}/skeleton`, "ref", () => [glTFObjectReference("nodes", skin.skeleton)], ignoreSet, true);
      }
    });
  }
  registerLightPointers() {
    this.scalarPointer("/extensions/KHR_lights_punctual/lights.length", "int", () => this.objectModel.lights.length, ignoreSet, true);
    this.objectModel.lights.forEach((light, lightIndex) => {
      this.pointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/color`, "float3", () => getDefaulted(light, ["color"], defaultFor("light.schema.json", "color", [1, 1, 1])), (value) => setPath(light, ["color"], vector(value)));
      this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/intensity`, "float", () => getDefaulted(light, ["intensity"], defaultFor("light.schema.json", "intensity", 1)), (value) => setPath(light, ["intensity"], value));
      this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/range`, "float", () => light.range ?? Infinity, (value) => light.range = value);
      if (light.type === "spot" || light.spot !== void 0) {
        light.spot = light.spot ?? {};
        this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/spot/innerConeAngle`, "float", () => getDefaulted(light, ["spot", "innerConeAngle"], defaultFor("light.spot.schema.json", "innerConeAngle", 0)), (value) => setPath(light, ["spot", "innerConeAngle"], value));
        this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/spot/outerConeAngle`, "float", () => getDefaulted(light, ["spot", "outerConeAngle"], defaultFor("light.spot.schema.json", "outerConeAngle", Math.PI / 4)), (value) => setPath(light, ["spot", "outerConeAngle"], value));
      }
    });
  }
  registerAnimationPointers() {
    this.objectModel.animations.forEach((animation, animationIndex) => {
      this.pointer(`/animations/${animationIndex}`, "ref", () => [glTFObjectReference("animations", animationIndex)], ignoreSet, true);
      this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/playhead`, "float", () => animation.playhead, ignoreSet, true);
      this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/virtualPlayhead`, "float", () => animation.virtualPlayhead, (value) => animation.virtualPlayhead = value);
      this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/minTime`, "float", () => animation.minTime, ignoreSet, true);
      this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/maxTime`, "float", () => animation.maxTime, ignoreSet, true);
      this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/isPlaying`, "bool", () => animation.isPlaying, ignoreSet, true);
    });
  }
  registerInteractivityEventPointers() {
    const interactivity = this.objectModel.extensions?.KHR_interactivity;
    const graph = interactivity?.graphs?.[interactivity.graph ?? 0];
    const eventCountWithLifecycleEvents = (graph?.events?.length ?? 0) + 2;
    for (let eventIndex = 0; eventIndex < eventCountWithLifecycleEvents; eventIndex++) {
      const path = `/extensions/KHR_interactivity/events/${eventIndex}`;
      this.pointer(path, "ref", () => [path], ignoreSet, true);
    }
  }
  // Asset Capabilities & runtime limits (KHR_interactivity spec 4.2.1 / 4.2.2): read-only virtual
  // properties describing the glTF version presented, which used extensions the implementation
  // supports, and the implementation's runtime limits. Extensions that are BOTH listed in
  // extensionsUsed AND supported get a concrete `enabled` = true pointer (so authoring can surface
  // them); every other asset extension `enabled` query resolves to false via assetExtensionEnabled.
  registerAssetCapabilityPointers() {
    const [majorVersion, minorVersion] = parseGltfVersion(this.objectModel.asset?.version);
    this.scalarPointer("/extensions/KHR_interactivity/asset/majorVersion", "int", () => majorVersion, ignoreSet, true);
    this.scalarPointer("/extensions/KHR_interactivity/asset/minorVersion", "int", () => minorVersion, ignoreSet, true);
    for (const extensionName of this.objectModel.extensionsUsed) {
      if (!SUPPORTED_GLTF_EXTENSIONS.has(extensionName)) {
        continue;
      }
      this.scalarPointer(`/extensions/KHR_interactivity/asset/extensions/${extensionName}/enabled`, "bool", () => true, ignoreSet, true);
    }
    for (const { name, value } of KHR_INTERACTIVITY_LIMITS) {
      this.scalarPointer(`/extensions/KHR_interactivity/limits/${name}`, "int", () => value, ignoreSet, true);
    }
  }
  isActiveDelayRef(path) {
    const match = path.match(/^\/extensions\/KHR_interactivity\/delays\/(\d+)$/);
    if (!match) {
      return false;
    }
    return this.behaveEngine.getScheduledDelay?.(Number(match[1])) !== void 0;
  }
  clearActiveAnimation(animationIndex) {
    const activeAnimation = this.activeAnimations.get(animationIndex);
    if (activeAnimation !== void 0) {
      if (activeAnimation.timeout !== null) {
        clearTimeout(activeAnimation.timeout);
      }
      this.activeAnimations.delete(animationIndex);
    }
  }
  currentAnimationTime(animationIndex) {
    const activeAnimation = this.activeAnimations.get(animationIndex);
    if (activeAnimation === void 0) {
      return this.objectModel.animations[animationIndex]?.virtualPlayhead ?? 0;
    }
    const elapsedSeconds = Math.max(0, (performance.now() - activeAnimation.startedAt) / 1e3);
    const direction = activeAnimation.startTime <= activeAnimation.endTime ? 1 : -1;
    return activeAnimation.startTime + direction * elapsedSeconds * activeAnimation.speed;
  }
  updateActiveAnimations() {
    for (const animationIndex of this.activeAnimations.keys()) {
      const animation = this.objectModel.animations[animationIndex];
      if (animation === void 0) {
        continue;
      }
      const requestedTime = this.currentAnimationTime(animationIndex);
      animation.virtualPlayhead = requestedTime;
      animation.playhead = effectiveAnimationTime(animation, requestedTime);
      this.applyAnimation(animationIndex, requestedTime);
    }
  }
  applyAnimation(animationIndex, requestedTime) {
    const animation = this.objectModel.animations[animationIndex];
    if (animation === void 0) {
      return;
    }
    const time = effectiveAnimationTime(animation, requestedTime);
    for (const channel of animation.runtimeChannels ?? []) {
      const node = this.objectModel.nodes[channel.targetNode];
      if (node === void 0) {
        continue;
      }
      const value = sampleAnimationChannel(channel, time);
      if (channel.targetPath === "translation" || channel.targetPath === "scale" || channel.targetPath === "rotation") {
        node[channel.targetPath] = value;
      } else if (channel.targetPath === "weights") {
        node.weights = value;
      }
    }
  }
  localMatrix(nodeIndex) {
    const node = this.objectModel.nodes[nodeIndex];
    if (node.matrix) {
      return matrixWithTranslation(node.matrix, node.translation);
    }
    return composeTrsMatrix(node.translation, node.rotation, node.scale);
  }
  globalMatrix(nodeIndex) {
    const parentIndex = this.objectModel.parents[nodeIndex];
    const local = this.localMatrix(nodeIndex);
    if (parentIndex === void 0) {
      return local;
    }
    return multiplyMatrices(this.globalMatrix(parentIndex), local);
  }
};
function createGlTFObjectModelFromGltf(gltf) {
  const meshes = (gltf.meshes ?? []).map(createObjectModelMesh);
  const nodes = (gltf.nodes ?? []).map((node) => createObjectModelNode(node, meshes));
  return completeGlTFObjectModel({
    nodes,
    parents: buildParentMap(nodes),
    materials: (gltf.materials ?? []).map(cloneValue2),
    meshes,
    cameras: (gltf.cameras ?? []).map(cloneValue2),
    skins: (gltf.skins ?? []).map(cloneValue2),
    scenes: (gltf.scenes ?? []).map((scene) => ({ ...cloneValue2(scene), nodes: scene.nodes ?? [] })),
    animations: (gltf.animations ?? []).map((animation) => createObjectModelAnimation(animation, gltf)),
    lights: (gltf.extensions?.KHR_lights_punctual?.lights ?? []).map(cloneValue2),
    scene: gltf.scene ?? 0,
    extensions: cloneValue2(gltf.extensions ?? {}),
    extensionsUsed: cloneValue2(gltf.extensionsUsed ?? []),
    asset: cloneValue2(gltf.asset ?? {})
  });
}
function completeGlTFObjectModel(objectModel) {
  const meshes = (objectModel.meshes ?? []).map(createObjectModelMesh);
  const nodes = (objectModel.nodes ?? []).map((node) => createObjectModelNode(node, meshes));
  return {
    nodes,
    parents: objectModel.parents ?? buildParentMap(nodes),
    materials: (objectModel.materials ?? []).map(cloneValue2),
    meshes,
    cameras: (objectModel.cameras ?? []).map(cloneValue2),
    skins: (objectModel.skins ?? []).map(cloneValue2),
    scenes: (objectModel.scenes ?? []).map((scene) => ({ ...cloneValue2(scene), nodes: scene.nodes ?? [] })),
    animations: (objectModel.animations ?? []).map((animation) => createObjectModelAnimation(animation, objectModel)),
    lights: (objectModel.lights ?? objectModel.extensions?.KHR_lights_punctual?.lights ?? []).map(cloneValue2),
    scene: objectModel.scene ?? 0,
    extensions: cloneValue2(objectModel.extensions ?? {}),
    extensionsUsed: cloneValue2(objectModel.extensionsUsed ?? []),
    asset: cloneValue2(objectModel.asset ?? {})
  };
}
function createObjectModelNode(node, meshes) {
  const mesh = node.mesh === void 0 ? void 0 : meshes[node.mesh];
  return {
    ...cloneValue2(node),
    translation: node.translation ?? matrixTranslation(node.matrix) ?? defaultFor("node.schema.json", "translation", [0, 0, 0]),
    scale: node.matrix === void 0 ? node.scale ?? defaultFor("node.schema.json", "scale", [1, 1, 1]) : node.scale,
    rotation: node.matrix === void 0 ? node.rotation ?? defaultFor("node.schema.json", "rotation", [0, 0, 0, 1]) : node.rotation,
    children: node.children ?? [],
    weights: createNodeWeights(node, mesh)
  };
}
function createObjectModelMesh(mesh) {
  const targetCount = getMeshMorphTargetCount(mesh);
  return {
    ...cloneValue2(mesh),
    primitives: mesh.primitives ?? [],
    weights: createMeshWeights(mesh, targetCount)
  };
}
function createNodeWeights(node, mesh) {
  if (mesh === void 0 || mesh.weights.length === 0) {
    return [];
  }
  return cloneValue2(node.weights ?? mesh.weights);
}
function createMeshWeights(mesh, targetCount) {
  if (targetCount === 0) {
    return [];
  }
  return cloneValue2(mesh.weights ?? new Array(targetCount).fill(0));
}
function getMeshMorphTargetCount(mesh) {
  return Math.max(0, ...(mesh.primitives ?? []).map((primitive) => primitive.targets?.length ?? 0));
}
function defaultFor(schemaName, propertyName, fallback) {
  const match = Object.entries(SCHEMA_DEFAULTS).find(([schemaPointer]) => schemaPointer.endsWith(`/${schemaName}#/properties/${propertyName}`));
  return cloneValue2(match?.[1] ?? fallback);
}
function textureTransformDefault(propertyName, fallback) {
  return schemaDefault(`${KHR}/KHR_texture_transform/schema/KHR_texture_transform.textureInfo.schema.json`, propertyName, fallback);
}
function textureInfoPaths(material) {
  const paths = ["normalTexture", "occlusionTexture", "emissiveTexture"];
  if (material.pbrMetallicRoughness !== void 0) {
    paths.push("pbrMetallicRoughness/baseColorTexture", "pbrMetallicRoughness/metallicRoughnessTexture");
  }
  for (const extensionName of Object.keys(material.extensions ?? {})) {
    collectTextureInfoPaths(material.extensions[extensionName], `extensions/${extensionName}`, paths);
  }
  return paths;
}
function collectTextureInfoPaths(value, prefix, paths) {
  if (value === void 0 || typeof value !== "object" || Array.isArray(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${prefix}/${key}`;
    if (key.endsWith("Texture") && child !== void 0 && typeof child === "object") {
      paths.push(childPath);
    }
    collectTextureInfoPaths(child, childPath, paths);
  }
}
function getDefaulted(target, pathParts, defaultValue) {
  const value = getPath(target, pathParts);
  return cloneValue2(value === void 0 ? defaultValue : value);
}
function getPath(target, pathParts) {
  return pathParts.reduce((current, key) => current?.[key], target);
}
function setPath(target, pathParts, value) {
  let current = target;
  pathParts.slice(0, -1).forEach((key) => {
    current[key] = current[key] ?? {};
    current = current[key];
  });
  current[pathParts[pathParts.length - 1]] = cloneValue2(value);
}
function scalar(value) {
  return Array.isArray(value) ? value[0] : value;
}
function vector(value) {
  return Array.isArray(value) ? cloneValue2(value) : [value];
}
function isScalarType(typeName) {
  return typeName === "bool" || typeName === "float" || typeName === "int";
}
function cloneValue2(value) {
  if (value === void 0) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue2);
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue2(child)]));
}
function ignoreSet(_value) {
  return void 0;
}
function matrixTranslation(matrix) {
  return matrix === void 0 ? void 0 : [matrix[12], matrix[13], matrix[14]];
}
function matrixWithTranslation(matrix, translation) {
  const result = [...matrix];
  result[12] = translation[0];
  result[13] = translation[1];
  result[14] = translation[2];
  return result;
}
function composeTrsMatrix(translation, rotation, scale) {
  const [x, y, z, w] = rotation;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const sx = scale[0];
  const sy = scale[1];
  const sz = scale[2];
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1
  ];
}
function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      out[column * 4 + row] = a[0 * 4 + row] * b[column * 4 + 0] + a[1 * 4 + row] * b[column * 4 + 1] + a[2 * 4 + row] * b[column * 4 + 2] + a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}
function buildParentMap(nodes) {
  const parents = {};
  nodes.forEach((node, parentIndex) => {
    for (const childIndex of node.children ?? []) {
      parents[childIndex] = parentIndex;
    }
  });
  return parents;
}
export {
  ADecorator,
  AnimationStart,
  AnimationStop,
  AnimationStopAt,
  BasicBehaveEngine,
  BehaveEngineNode,
  DOMEventBus,
  GlTFObjectModelDecorator,
  OnHoverIn,
  OnHoverOut,
  OnSelect,
  createGlTFObjectModelFromGltf,
  cubicBezier,
  cubicBezierEase,
  easeFloat,
  easeFloat3,
  easeFloat4,
  linearFloat,
  readGlbJsonFromArrayBuffer,
  slerpFloat4
};
