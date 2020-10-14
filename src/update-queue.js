export class Update {
  constructor(payload) {
    this.payload = payload;
  }
}

// 更新队列为一个链表结构
export class UpdateQueue {
  constructor() {
    this.firstUpdate = null;
    this.lastUpdate = null;
  }
  enqueueUpdate(update) {
    if (this.lastUpdate === null) {
      this.firstUpdate = update;
      this.lastUpdate = update;
    } else {
      this.lastUpdate.nextUpdate = update;
      this.lastUpdate = update;
    }
  }
  forceUpdate(state) {
    let currentUpdate = this.firstUpdate;
    while (currentUpdate) {
      let nextState =
        typeof currentUpdate.payload === "function"
          ? currentUpdate.payload(state)
          : currentUpdate.payload;
      state = { ...state, ...nextState };
      currentUpdate = currentUpdate.nextUpdate;
    }
    this.firstUpdate = null;
    this.lastUpdate = null;
    return state;
  }
}
