import React from "react";

import { UnmountClosed as Collapse } from "react-collapse";
import FlipMove from "react-flip-move";

import api from "../js/api-helper";

import Form from "./form";
import Spinner from "./spinner";
import Stock from "./stock";

class Main extends React.Component {
  state = {
    formIsVisible: false,
    isLoading: api.hasStoredStocks(),
    stocks: []
  };

  componentDidMount() {
    api.getStocks().then(stocks => {
      this.setState({ isLoading: false, stocks });
    });
  }

  addStock = formData => {
    this.setState({ formIsVisible: false, isLoading: true }, () => {
      // Delay api call because flipMove doesn't do interrupts well
      setTimeout(() => {
        api
          .addStock(formData)
          .then(stocks => {
            this.setState({ isLoading: false, stocks });
          })
          .catch(e => {
            this.setState({ isLoading: false });
            alert(e);
          });
      }, 700);
    });
  };

  showForm = () => {
    this.setState({ formIsVisible: true });
  };

  deleteStock = id => {
    api.deleteStock(id).then(stocks => {
      this.setState({ stocks });
    });
  };

  render() {
    const stocksWithLoader = this.state.stocks.map(stock => (
      <Stock key={stock.id} onDelete={this.deleteStock} {...stock} />
    ));

    stocksWithLoader.push(
      this.state.isLoading && (
        <Spinner type="tbody" key="spinner">
          {spinnerEl => (
            <tr>
              <td colSpan={3}>{spinnerEl}</td>
            </tr>
          )}
        </Spinner>
      )
    );

    return (
      <div>
        <Collapse isOpened={true}>
          <FlipMove
            className="stocks"
            duration={700}
            easing="cubic-bezier(0.25, 0.12, 0.22, 1)"
            staggerDurationBy={50}
            typeName="table"
          >
            {stocksWithLoader.map(element => element)}
          </FlipMove>
        </Collapse>

        <div className="form-container">
          <Collapse isOpened={this.state.formIsVisible}>
            <Form onSubmit={this.addStock} />
          </Collapse>

          <button
            className="form-button"
            onClick={this.showForm}
            type="button"
            disabled={this.state.formIsVisible}
          >
            +
          </button>
        </div>
      </div>
    );
  }
}

export default Main;
