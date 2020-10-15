import { ELEMENT_TEXT } from "./constants";
import { Update, UpdateQueue } from "./update-queue";
import { scheduleRoot, useReducer } from "./scheduler";

function createElement(type, config, ...children) {
  delete config.__self;
  delete config.__source;
  return {
    type,
    props: {
      ...config,
      children: children.map((child) => {
        return typeof child === "object"
          ? child
          : {
              type: ELEMENT_TEXT,
              props: { text: child, children: [] },
            };
      }),
    },
  };
}
class Component {
  constructor(props) {
    this.props = props;
    this.updateQueue = new UpdateQueue();
  }
  setState(payload) {
    let update = new Update(payload);
    this.internalFiber.updateQueue.enqueueUpdate(update);
    scheduleRoot(); // 从根节点开始调度
  }
}
Component.prototype.isReactComponent = {}; // 表示类组件
export default {
  createElement,
  Component,
  useReducer,
};
