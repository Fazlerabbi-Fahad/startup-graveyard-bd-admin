// Keep dragged rows on the vertical axis (avoids pulling in @dnd-kit/modifiers for one function).
export const restrictToVertical = ({ transform }) => ({ ...transform, x: 0 });
