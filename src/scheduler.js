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
  DELETION,
  UPDATE,
  TAG_CLASS,
} from "./constants";
import { Update, UpdateQueue } from "./update-queue";
import { setProps } from "./utils";
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // 正在渲染的RootFiber应用的根节点
let currentRoot = null; // 上一次的workInProgressRoot（有值代表页面已经渲染过）
let deletions = []; // 记录需要删除的effect list
export function scheduleRoot(rootFiber) {
  // 此时页面已经更新渲染过一次
  if (currentRoot && currentRoot.alternate) {
    workInProgressRoot = currentRoot.alternate; // 把上上次的渲染rootFiber作为此次的workInProgressRoot

    workInProgressRoot.alternate = currentRoot;
    if (rootFiber) {
      workInProgressRoot.props = rootFiber.props;
    }
    // 此时页面已经渲染过一次
  } else if (currentRoot) {
    if (rootFiber) {
      // 新的渲染rootFiber的alternate属性指向上次已经渲染过得rootFiber节点
      rootFiber.alternate = currentRoot;
      // 把workInProgressRoot指向当前的rootFiber节点
      workInProgressRoot = rootFiber;
    } else {
      workInProgressRoot = {
        ...currentRoot,
        alternate: currentRoot,
      };
    }
  } else {
    workInProgressRoot = rootFiber;
  }
  workInProgressRoot.firstEffect = null;
  workInProgressRoot.lastEffect = null;
  workInProgressRoot.nextEffect = null;
  nextUnitOfWork = workInProgressRoot;
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

/**
 * 完成时收集有副作用的fiber，然后组成effect list
 * 这里的逻辑为:
 * 1. 判断父fiber节点是否存在，存在则父fiber节点等于当前fiber节点的firstEffect指向fiber
 * 2. 让父fiber节点等于当前fiber节点lastEffect指向的fiber节点
 * 3. 让父fiber节点的lastEffect的fiber节点的nextEffect节点为当前fiber节点
 * @param {object} currentFiber 当前fiber
 */
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
  } else if (currentFiber.tag === TAG_CLASS) {
    updateClassComponent(currentFiber);
  }
}

function updateClassComponent(currentFiber) {
  // 第一次
  if (!currentFiber.stateNode) {
    // 此时的stateNode节点为组件实例
    currentFiber.stateNode = new currentFiber.type(currentFiber.props);
    currentFiber.stateNode.internalFiber = currentFiber;
    currentFiber.updateQueue = new UpdateQueue();
  }
  currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(
    currentFiber.stateNode.state
  );
  let newElement = currentFiber.stateNode.render();
  const newChildren = [newElement];
  reconcileChildren(currentFiber, newChildren);
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

/**
 * 调和子react元素转换成fiber节点，并把当前fiber节点的child为子fiber列表中的第一个，子fiber之间用sibling指针连接起来
 * @param {object} currentFiber 当前fiber节点
 * @param {object} newChildren 当前fiber节点对应的子react元素节点
 */
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0; // newChildren节点的索引
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  // 因为相同类型时第三次更新需要复用oldFiber节点，则需要把指针清空
  if (oldFiber) {
    oldFiber.firstEffect = null;
    oldFiber.lastEffect = null;
    oldFiber.nextEffect = null;
  }

  let prevSibling; // 上一个子fiber
  while (newChildIndex < newChildren.length || oldFiber) {
    // 如果有新增元素则会走或逻辑
    let newChild = newChildren[newChildIndex]; // 取出当前react元素
    let newFiber;
    const sameType = oldFiber && newChild && oldFiber.type === newChild.type;
    let tag;
    if (
      newChild &&
      typeof newChild.type === "function" &&
      newChild.type.prototype.isReactComponent
    ) {
      tag = TAG_CLASS;
    } else if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    } else if (newChild && typeof newChild.type === "string") {
      tag = TAG_HOST;
    }
    // 老fiber的type与新react元素的type一致
    if (sameType) {
      // 复用fiber节点
      if (oldFiber.alternate) {
        newFiber = oldFiber.alternate;
        newFiber.props = newChild.props;
        newFiber.alternate = oldFiber;
        newFiber.effectTag = UPDATE;
        newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
        newFiber.nextEffect = null;
      } else {
        newFiber = {
          tag: oldFiber.tag, // 当前react元素对应的fiber类型
          type: oldFiber.type, // react元素的type
          props: newChild.props, // react元素的的props
          stateNode: oldFiber.stateNode, // 真实DOM
          alternate: oldFiber, // 新的fiber节点指向老的fiber节点
          return: currentFiber, // 父fiber
          effectTag: UPDATE, // 副作用标识（增加、删除、插入）
          updateQueue: oldFiber.updateQueue || new UpdateQueue(), // 更新state队列
          nextEffect: null, // 值也是单链表
        };
      }
    } else {
      if (newChild) {
        newFiber = {
          tag, // 当前react元素对应的fiber类型
          type: newChild.type, // react元素的type
          props: newChild.props, // react元素的的props
          stateNode: null, // 真实DOM
          return: currentFiber, // 父fiber
          effectTag: PLACEMENT, // 副作用标识（增加、删除、插入）
          updateQueue: new UpdateQueue(),
          nextEffect: null, // 值也是单链表
        };
      }
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (newFiber) {
      if (newChildIndex === 0) {
        // 当前Fiber节点的child指向children Fiber的第一个
        currentFiber.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }
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
  // 把记录在deletions中的effect list对应的DOM节点删除
  deletions.forEach(commitWork);

  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  deletions.length = 0;
  currentRoot = workInProgressRoot; // 把当前已经渲染成功之后的workInProgressRoot用currentRoot保存起来
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) return;
  let returnFiber = currentFiber.return;
  // 如果不是这三种类型的fiber就一直往父fiber找，找到最近的其中之一，当然不可能是TAG_TEXT类型
  while (
    returnFiber.tag !== TAG_ROOT &&
    returnFiber.tag !== TAG_HOST &&
    returnFiber.tag !== TAG_TEXT
  ) {
    returnFiber = returnFiber.return;
  }
  let DOMReturn = returnFiber.stateNode;
  // 新增节点
  if (currentFiber.effectTag === PLACEMENT) {
    // returnFiber的类型只能属于其中之一（TAG_HOST、TAG_TEXT）
    let nextFiber = currentFiber;
    // 如果要挂在的节点的fiber不是DOM对应的fiber，则一直往下找到真实DOM类型的fiber节点为止
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = currentFiber.child;
    }
    DOMReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
    // 删除DOMReturn的子DOM元素
    return commitDeletion(currentFiber, DOMReturn);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      }
    }
  } else {
    updateDOM(
      currentFiber.stateNode,
      currentFiber.alternate.props,
      currentFiber.props
    );
  }
  currentFiber.effectTag = null;
}

function commitDeletion(currentFiber, DOMReturn) {
  if (currentFiber.tag == TAG_HOST || currentFiber.tag === TAG_TEXT) {
    // 删除节点(此时DOMReturn是DOM元素)
    DOMReturn.removeChild(currentFiber.stateNode);
  } else {
    commitDeletion(currentFiber.child, DOMReturn);
  }
}

requestIdleCallback(workLoop, { timeout: 500 });
