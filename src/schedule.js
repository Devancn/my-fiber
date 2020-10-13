/**
 * 从根节点开始渲染和调度
 * diff阶段，对比新旧的虚拟DOM，进行增量更新或创建，可暂停(render阶段)
 * render阶段成果是effect list知道哪些节点更新哪些阶段删除，哪些节点增加了
 * commit阶段，进行DOM更新创建阶段，此阶段不能暂停
 */

import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_TEXT,
  TAG_HOST,
  PLACEMENT,
} from "./constants";
import { setProps } from "./utils";
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber应用的根
export function scheduleRoot(rootFiber) {
  workInProgressRoot = rootFiber;
  nextUnitOfWork = rootFiber;
}

// 深度遍历转换成fiber节点，知道叶子节点
function performUnitOfWork(currentFiber) {
  beginWork(currentFiber); // 开始工作
  if (currentFiber.child) {
    return currentFiber.child;
  }
  // 此时currentFiber属于叶子节点没有child节点
  while (currentFiber) {
    completeUnitOfWork(currentFiber); // 没有child和sibling时会调用此方法（代表当前节点可以做完成操作）
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    currentFiber = currentFiber.return;
  }
}

// 完成时收集有副作用的fiber，然后组成effect list
function completeUnitOfWork(currentFiber) {
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    // 把自己儿子的effectList挂到父亲身上
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    /*------------------------------------------------------------------------- */
    const effectTag = currentFiber.effectTag; // 副作用表示（增加、删除、插入）
    // 每个fiber分别有firstEffect与lastEffect(分别表示第一个有副作用的fiber与最后一个有辅佐用的fiber)
    // 兄弟之间的Effect fiber使用nextEffect连接
    if (effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
}

/**
 * 1.创建真实DOM元素
 * 2.创建子fiber
 */
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber);
  }
}

/**
 * 主要两件事：
 * 1. 创建当前fiber对应DOM元素
 * 2. 根据当前fiber的props的children(此时的children为react元素)创建fiber节点，并把当前fiber节点指向children元素的第一个react元素转换之后的fiber节点，children中的fiber节点使用sibling相连
 * @param {object} currentFiber fiber元素 
 */
function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children; // react元素
  reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  } else if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  let newChildren = currentFiber.props.children; // react 元素
  reconcileChildren(currentFiber, newChildren);
}

function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0; // newChildren节点的索引
  let prevSibling; // 上一个子fiber
  while (newChildIndex < newChildren.length) {
    let newChild = newChildren[newChildIndex]; // 取出当前react元素
    let tag;
    if (newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    } else if (typeof newChild.type === "string") {
      tag = TAG_HOST;
    }
    let newFiber = {
      tag, // 当前react元素对应的fiber类型
      type: newChild.type, // react元素的type
      props: newChild.props, // react元素的的props
      stateNode: null, // 真实DOM
      return: currentFiber, // 父fiber
      effectTag: PLACEMENT, // 副作用标识（增加、删除、插入）
      nextEffect: null, // 值也是单链表
    };
    if (newChildIndex === 0) {
      // 当前Fiber节点的child指向children Fiber的第一个
      currentFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    newChildIndex++;
  }
}

// 循环执行工作， nextUnitWork
function workLoop(deadline) {
  let shouldYield = false; // 根据剩余时间判断是否继续执行任务
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log("render阶段结束");
    commitRoot();
  }
  requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) return;
  let returnFiber = currentFiber.return;
  let returnDOM = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    returnDOM.appendChild(currentFiber.stateNode);
  }
  currentFiber.effectTag = null;
}
requestIdleCallback(workLoop, { timeout: 500 });
