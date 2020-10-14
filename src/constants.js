export const ELEMENT_TEXT = Symbol.for("ELEMENT_TEXT"); // 文本元素
export const TAG_ROOT = Symbol.for("TAG_ROOT"); // 根Fiber
export const TAG_HOST = Symbol.for("TAG_HOST"); // 标签
export const TAG_TEXT = Symbol.for("TAG_TEXT"); // 文本节点
export const TAG_CLASS = Symbol.for("TAG_CLASS"); // 类组件

// fiber副作用标识
export const PLACEMENT = Symbol.for("PLACEMENT"); // 增加
export const UPDATE = Symbol.for("UPDATE");
export const DELETION = Symbol.for("DELETION");
