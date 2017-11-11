import React from "react";
import PropTypes from "prop-types";

import { Line } from "react-chartjs-2";

import api from "../../js/api-helper";
import css from "./graph.module.scss";
import graphUtils from "./graph-utils";
import months from "../../data/months.json";
import utils from "../../js/utils";

class Graph extends React.Component {
  static propTypes = {
    width: PropTypes.number
  };

  state = {
    points: api.getGraphPoints(),
    showGraph: true
  };

  componentWillReceiveProps() {
    this.setState({ showGraph: false }, () => {
      this.setState({ showGraph: true });
    });
  }

  getGradient = (canvas, points) => {
    const max = points.reduce((accum, p) => (p.y > accum ? p.y : accum), 0);
    const min = points.reduce((accum, p) => (p.y < accum ? p.y : accum), 0);
    const mid = utils.rangeMap(0, min, max, 1, 0);
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(Math.max(0, mid - 0.1), "#69e697");
    gradient.addColorStop(Math.max(0, Math.min(1, mid)), "#cbb16f");
    gradient.addColorStop(Math.min(1, mid + 0.1), "#ff6874");
    return gradient;
  };

  render() {
    return !this.state.showGraph
      ? null
      : (() => {
          const data = canvas => {
            return {
              datasets: [
                {
                  data: this.state.points,
                  borderColor: this.getGradient(canvas, this.state.points)
                }
              ],
              labels: this.state.points.map(p => {
                const date = new Date(p.x);
                return `${date.getDate()} ${months[date.getMonth()]}`;
              })
            };
          };

          return (
            <Line
              className={css.graph}
              data={data}
              width={this.props.width}
              height={this.props.width / 2.5}
              options={graphUtils.getOptions()}
              ref={l => (this.chart = l)}
            />
          );
        })();
  }
}

export default Graph;
