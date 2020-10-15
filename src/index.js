import React from "./react";
import ReactDOM from "./react-dom";

class ClassCounter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { number: 0 };
  }
  onClick = () => {
    this.setState((state) => ({ number: state.number + 1 }));
  };
  render() {
    return (
      <div id="counter">
        <span>{this.state.number}</span>
        <button onClick={this.onClick}>加1</button>
      </div>
    );
  }
}
const ADD = "ADD";
function reducer(state, action) {
  switch (action.type) {
    case ADD:
      return {
        count: state.count + 1,
      };
    default:
      return state;
  }
}

function FunctionCounter() {
  const [countState, dispatch] = React.useReducer(reducer, { count: 0 });
  return (
    <div id="counter">
      <span>{countState.count}</span>
      <button onClick={() => dispatch({ type: ADD })}>加1</button>
    </div>
  );
}
ReactDOM.render(
  <FunctionCounter name="计数器" />,
  document.getElementById("root")
);
