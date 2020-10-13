import { TAG_ROOT } from "./constants";
import { scheduleRoot } from "./schedule";

function render(element, container) {
  let rootFiber = {
    tag: TAG_ROOT, // 表示此元素的类型,
    stateNode: container, // 如果是html元素，则指向对应真实dom
    props: {
      children: [element], // element为React元素
    },
  };

  scheduleRoot(rootFiber);
}

export default {
  render,
};
