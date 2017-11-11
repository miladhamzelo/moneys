import React from "react";
import PropTypes from "prop-types";

import cn from "classnames";

import css from "./stock.module.scss";

import Number from "../number";

class Stock extends React.Component {
  static propTypes = {
    currencySymbol: PropTypes.string,
    id: PropTypes.string.isRequired,
    longName: PropTypes.string,
    onDelete: PropTypes.func,
    price: PropTypes.number,
    purchasePrice: PropTypes.number,
    qty: PropTypes.number,
    symbol: PropTypes.string
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

  render() {
    const { currencySymbol, price, purchasePrice, qty } = this.props;
    const absoluteDifference = ((price - purchasePrice) * qty).toFixed(2);
    const relativeDifference = (price / purchasePrice * 100 - 100).toFixed(2);
    const symbol = absoluteDifference >= 0 ? "+" : "";
    const isPositive = absoluteDifference >= 0;

    return (
      <tbody
        className={cn(css.stock, { [css.hasHover]: this.state.hasHover })}
        onClick={this.onClick}
      >
        <tr className={css.firstRow}>
          <td>
            <div className={css.description}>
              <div className={css.ticker}>{this.props.symbol}</div>{" "}
            </div>
          </td>
          <td
            className={cn(
              css.percentage,
              isPositive ? css.isPositive : css.isNegative
            )}
          >
            {`${symbol}${relativeDifference}%`}
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
                className={css.deleteButton}
                type="button"
                onClick={this.delete}
              >
                Slett
              </button>
            </div>
          </td>
        </tr>
        <tr className={css.lastRow}>
          <td>
            <div className={css.longName}>{this.props.longName}</div>
          </td>
          <td colSpan={2} className={css.moreStuff}>
            <span >{`${currencySymbol} ${purchasePrice} → ${currencySymbol} ${price.toFixed(
              2
            )}`}</span>
            <span>{`Ant.: ${qty}`}</span>
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
