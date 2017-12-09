import React from "react";
import PropTypes from "prop-types";

import cn from "classnames";
import currencySymbols from "world-currencies";
import get from "lodash/get";

import css from "./stock.module.scss";
import utils from "../../js/utils";

import Number from "../number";
import CircleDollar from "../icons/circle-dollar";
import CircleX from "../icons/circle-x";
import Warning from "../icons/warning";

class Stock extends React.Component {
  static propTypes = {
    currency: PropTypes.string,
    id: PropTypes.string.isRequired,
    isOutdated: PropTypes.bool,
    labels: PropTypes.object,
    longName: PropTypes.string,
    onDelete: PropTypes.func,
    onRealize: PropTypes.func,
    price: PropTypes.number,
    purchaseRate: PropTypes.number,
    qty: PropTypes.number,
    symbol: PropTypes.string
  };

  static defaultProps = {
    price: 0,
    purchasePrice: 0,
    qty: 0,
    onDelete: () => {},
    onRealize: () => {}
  };

  state = {
    hasHover: false
  };

  onMouseEnter = () => {
    this.setState({ hasHover: true });
  };

  onMouseLeave = () => {
    this.setState({ hasHover: false });
  };

  onClick = () => {
    this.setState(state => ({ hasHover: !state.hasHover }));
  };

  delete = () => {
    this.props.onDelete(this.props.id);
  };

  realize = () => {
    this.props.onRealize(this.props.id);
  };

  render() {
    const { currency, purchaseRate, price, qty } = this.props;
    const absoluteDifference = ((price - purchaseRate) * qty).toFixed(2);
    const relativeDifference = (price / purchaseRate * 100 - 100).toFixed(2);

    const currencySymbol = get(
      currencySymbols,
      `${currency}.units.major.symbol`,
      ""
    );

    return (
      <tbody
        className={cn(css.stock, { [css.hasHover]: this.state.hasHover })}
        onClick={this.onClick}
      >
        <tr className={css.firstRow}>
          <td>
            <div className={css.description}>
              <div className={css.ticker}>
                {this.props.symbol}
                {this.props.isOutdated && (
                  <span
                    className={css.warning}
                    title={this.props.labels.isOutdated}
                  >
                    <Warning />
                  </span>
                )}
              </div>{" "}
            </div>
          </td>
          <td
            className={cn(css.percentage, {
              [css.isPositive]: absoluteDifference > 0,
              [css.isNegative]: absoluteDifference < 0
            })}
          >
            <Number
              number={relativeDifference}
              currencySymbol="%"
              currencySymbolIsSuperScript={false}
            />
          </td>
          <td className={css.number}>
            <Number
              number={absoluteDifference}
              currencySymbol={currencySymbol}
            />

            <div
              className={css.hoverTarget}
              onMouseEnter={this.onMouseEnter}
              onMouseLeave={this.onMouseLeave}
            >
              <button
                className={css.realizeButton}
                onClick={this.realize}
                title={this.props.labels.realizeButton}
                type="button"
              >
                <CircleDollar />
              </button>
              <button
                className={css.deleteButton}
                type="button"
                title={this.props.labels.deleteButton}
                onClick={this.delete}
              >
                <CircleX />
              </button>
            </div>
          </td>
        </tr>
        <tr className={css.lastRow}>
          <td colSpan={3}>
            <div className={css.lastRowContent}>
              <div className={css.longName}>{this.props.longName}</div>
              <div className={css.moreStuff}>
                <span>{`${currencySymbol} ${utils.formatNumber(
                  purchaseRate
                )} → ${currencySymbol} ${utils.formatNumber(price)}`}</span>
                <span>{`${this.props.labels.qtyLabel}: ${utils.formatNumber(
                  qty
                )}`}</span>
              </div>
            </div>
            <div
              className={css.hoverTarget}
              onMouseEnter={this.onMouseEnter}
              onMouseLeave={this.onMouseLeave}
            />
          </td>
        </tr>
      </tbody>
    );
  }
}

export default Stock;
