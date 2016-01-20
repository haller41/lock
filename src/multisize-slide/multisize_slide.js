import React from 'react';
import ReactDOM from 'react-dom';
import CSSCore from 'fbjs/lib/CSSCore';

export default class Slider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {children: {current: props.children}};
  }

  componentWillReceiveProps(nextProps) {
    // TODO: take a prop to identify what are we rendering instead of
    // infering it from children keys so we can accept more than one
    // child (we are already wrapping them).
    if (this.state.children.current.key != nextProps.children.key) {
      this.setState({
        children: {
          current: nextProps.children,
          prev: this.state.children.current
        },
        transitionName: this.props.transitionName
      });
      this.animate = true;
    } else if (!this.timeout) {
      this.setState({children: {current: nextProps.children}, transitionName: nextProps.transitionName});
    }
  }

  componentDidUpdate() {
    if (this.animate) {
      this.animate = false;

      const { transitionName } = this.state;
      const { current, prev } = this.state.children;
      const { reverse } = this.props;
      const currentComponent = this.refs[current.key];
      const prevComponent = this.refs[prev.key];

      const transition = (component, className, delay) => {
        const node = ReactDOM.findDOMNode(component);
        const activeClassName = `${className}-active`;

        CSSCore.addClass(node, className);

        setTimeout(() => CSSCore.addClass(node, activeClassName), 17);

        if (delay) {
          setTimeout(() => {
            CSSCore.removeClass(node, className);
            CSSCore.removeClass(node, activeClassName);
          }, delay);
        }
      };

      const callback = (slide) => {
        currentComponent.componentWillSlideIn(slide);
        const classNamePrefix = reverse ? "reverse-" : "";
        transition(currentComponent, `${classNamePrefix}${transitionName}-enter`, this.props.delay);
        transition(prevComponent, `${classNamePrefix}${transitionName}-leave`);

        this.timeout = setTimeout(() => {
          this.setState({children: {current: this.state.children.current}, transitionName: this.props.transitionName});
          currentComponent.componentDidSlideIn();
          this.props.onDidSlide();
          this.timeout = null;
        }, this.props.delay);
      };

      this.props.onWillSlide();
      prevComponent.componentWillSlideOut(callback);
    }
  }

  componentWillUnmount() {
    if (this.timeout) clearTimeout(this.timeout);
  }

  render() {
    const {current, prev} = this.state.children;
    const children = prev ? [current, prev] : [current];
    const childrenToRender = children.map(child => {
      return React.cloneElement(
        React.createElement(Child, {}, child),
        {ref: child.key, key: child.key}
      );
    });

    return React.createElement(this.props.component, {}, childrenToRender);
  }
}

Slider.propTypes = {
  component: React.PropTypes.string,
  delay: React.PropTypes.number.isRequired,
  onDidSlide: React.PropTypes.func.isRequired,
  onWillSlide: React.PropTypes.func.isRequired,
  reverse: React.PropTypes.bool.isRequired,
  transitionName: React.PropTypes.string.isRequired
};

Slider.defaultProps = {
  component: "span",
  onSlideIn: () => {},
  onSlideOut: () => {},
  reverse: false
};

class Child extends React.Component {

  constructor(props) {
    super(props);
    this.state = {height: "", originalHeight: "", show: true};
  }

  componentWillSlideIn(slide) {
    const node = ReactDOM.findDOMNode(this);

    this.setState({
      height: slide.height,
      originalHeight: parseInt(window.getComputedStyle(node, null).height, 10),
      show: false
    });
  }

  componentDidSlideIn() {
    const { height, originalHeight } = this.state;

    if (height === originalHeight) {
      this.setState({show: true, height: ""});
    } else {
      const frames = 10;
      let count = 0;
      let current = height;
      const last = originalHeight;
      const step = Math.abs(current - last) / frames;
      const dir =  current < last ? 1 : -1;
      const dh  = step * dir;

      // TODO: rAF
      this.t = setInterval(() => {
        if (count < frames - 1) {
          this.setState({height: current, animating: true});
          current += dh;
          count++;
        } else {
          clearInterval(this.t);
          delete this.t;
          this.setState({height: "", show: true});
        }
      }, 17);
    }
  }

  componentWillSlideOut(cb) {
    const node = ReactDOM.findDOMNode(this);
    const size = window.getComputedStyle(node, null).height;
    cb({height: parseInt(size, 10), reverse: this.reverse});
  }

  render() {
    const { children } = this.props;
    const { height, show } = this.state;

    return (
      <div style={height ? {height: height + "px"} : {}}>
        <div style={{visibility: show ? "inherit" : "hidden"}}>
          {children}
        </div>
      </div>
    );
  }

}
