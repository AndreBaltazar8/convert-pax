import {BasicBehaveEngine, DOMEventBus, OnSelect, OnHoverIn, OnHoverOut, AnimationStart, AnimationStop, AnimationStopAt} from './vendor/interactivity.js';
export function createBehaviorEngine(bus=new DOMEventBus()){
  const engine=new BasicBehaveEngine(60,bus);
  for(const [name,Type]of Object.entries({'event/onSelect':OnSelect,'event/onHoverIn':OnHoverIn,'event/onHoverOut':OnHoverOut,'animation/start':AnimationStart,'animation/stop':AnimationStop,'animation/stopAt':AnimationStopAt}))if(!engine.registry.has(name))engine.registerBehaveEngineNode(name,Type);
  return engine;
}
export function validateInteractivity(json){
  const ext=json.extensions?.KHR_interactivity;if(!ext)return;
  if(!Array.isArray(ext.graphs)||!ext.graphs.length||!Number.isInteger(ext.graph??0)||!ext.graphs[ext.graph??0])throw new Error('Invalid KHR_interactivity graph selection');
  const engine=createBehaviorEngine();
  try{for(const graph of ext.graphs){engine.validateGraph(graph);for(const d of graph.declarations||[])if(d.extension||!engine.registry.has(d.op))throw new Error(`No progressive interactivity operation adapter: ${d.extension??''} ${d.op}`);}}
  finally{engine.dispose();}
}
