import React from "react";
import PropTypes from "prop-types";

import cn from "classnames";
import currencySymbols from "world-currencies";
import get from "lodash/get";
import { Motion, spring } from "react-motion";

import css from "./stock.module.scss";
import utils from "../../js/utils";

import Number from "../number";
import CircleDollar from "../icons/circle-dollar";
import CircleX from "../icons/circle-x";
import StaticContainer from "../static-container";
import Warning from "../icons/warning";

class Stock extends React.Component {
  static propTypes = {
    currencies: PropTypes.object,
    currency: PropTypes.string,
    id: PropTypes.string.isRequired,
    isOutdated: PropTypes.bool,
    labels: PropTypes.object,
    longName: PropTypes.string,
    onDelete: PropTypes.func,
    onRealize: PropTypes.func,
    price: PropTypes.number,
    purchaseRate: PropTypes.number,
    purchasePrice: PropTypes.number,
    qty: PropTypes.number,
    shouldConvertCurrency: PropTypes.bool,
    symbol: PropTypes.string,
    userCurrency: PropTypes.string
  };

  static defaultProps = {
    price: 0,
    purchasePrice: 0,
    qty: 0,
    onDelete: () => {},
    onRealize: () => {}
  };

  state = {
    isSliding: false,
    slideProgress: 0,
    shouldConvertCurrency: this.props.shouldConvertCurrency
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.shouldConvertCurrency !== this.props.shouldConvertCurrency) {
      this.setState({ shouldConvertCurrency: nextProps.shouldConvertCurrency });
    }
  }

  onMouseEnter = () => {
    this.setState({
      isAnimating: true,
      isSliding: true,
      slideProgress: 1,
      springConfig: {}
    });
  };

  onMouseLeave = () => {
    this.setState({ isAnimating: true, isSliding: false, slideProgress: 0 });
  };

  onClick = () => {
    this.setState(state => ({
      shouldConvertCurrency: !state.shouldConvertCurrency
    }));
  };

  onTouchStart = e => {
    this.touchStartX = e.touches[0].clientX;
    this.lastTouchX = e.touches[0].clientX;
    this.setState({ springConfig: { stiffness: 300, damping: 20 } });
  };

  onTouchMove = e => {
    const delta = (this.lastTouchX - e.touches[0].clientX) / 90;

    this.lastTouchX = e.touches[0].clientX;
    this.setState(state => ({
      isAnimating: true,
      isSliding: true,
      slideProgress: utils.clamp(state.slideProgress + delta, 0, 1)
    }));
  };

  onTouchEnd = () => {
    this.setState(state => ({
      isAnimating: true,
      isSliding: state.slideProgress > 0.5,
      slideProgress: state.slideProgress > 0.5 ? 1 : 0
    }));
  };

  onMotionRest = () => {
    this.setState({ isAnimating: false });
  };

  delete = () => {
    this.props.onDelete(this.props.id);
  };

  realize = () => {
    this.props.onRealize(this.props.id);
  };

  render() {
    const {
      currencies,
      currency,
      purchaseRate,
      purchasePrice,
      price,
      qty,
      userCurrency
    } = this.props;
    const { slideProgress, springConfig } = this.state;

    const shouldConvertCurrency =
      this.state.shouldConvertCurrency && currency !== userCurrency;
    const convertedPrice = utils.convert(
      price,
      currency,
      userCurrency,
      currencies
    );
    const absoluteDifference = shouldConvertCurrency
      ? convertedPrice * qty - purchasePrice
      : (price - purchaseRate) * qty;
    const relativeDifference = shouldConvertCurrency
      ? convertedPrice * qty / purchasePrice * 100 - 100
      : price / purchaseRate * 100 - 100;

    const currencySymbol = get(
      currencySymbols,
      `${shouldConvertCurrency ? userCurrency : currency}.units.major.symbol`,
      ""
    );
    const stockCurrencySymbol = get(
      currencySymbols,
      `${currency}.units.major.symbol`,
      ""
    );

    return (
      <Motion
        defaultStyle={{ x: 0, opacity: 0, scale: 0.4 }}
        onRest={this.onMotionRest}
        style={{
          x: spring(90 * slideProgress, springConfig),
          opacity: spring(slideProgress, springConfig),
          scale: spring(
            utils.rangeMap(slideProgress, 0, 1, 0.4, 1),
            springConfig
          )
        }}
      >
        {motion => (
          <tbody
            className={cn(css.stock, {
              [css.isSliding]: this.state.isSliding
            })}
            onClick={this.onClick}
            onTouchStart={this.onTouchStart}
            onTouchMove={this.onTouchMove}
            onTouchEnd={this.onTouchEnd}
            style={{ transform: `translateX(${-motion.x}px)` }}
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
                  </div>
                </div>
              </td>
              <td
                className={cn(css.percentage, {
                  [css.isPositive]: absoluteDifference > 0,
                  [css.isNegative]: absoluteDifference < 0
                })}
              >
                <StaticContainer shouldUpdate={!this.state.isAnimating}>
                  <Number
                    number={relativeDifference}
                    currencySymbol="%"
                    currencySymbolIsSuperScript={false}
                  />
                </StaticContainer>
              </td>
              <td className={css.number}>
                <StaticContainer shouldUpdate={!this.state.isAnimating}>
                  <Number
                    number={absoluteDifference}
                    currencySymbol={currencySymbol}
                  />
                </StaticContainer>

                <div
                  className={css.hoverTarget}
                  onMouseEnter={this.onMouseEnter}
                  onMouseLeave={this.onMouseLeave}
                  style={{ transform: `translateX(${motion.x}px)` }}
                >
                  <button
                    className={css.realizeButton}
                    onClick={this.realize}
                    title={this.props.labels.realizeButton}
                    type="button"
                    style={{
                      opacity: motion.opacity,
                      transform: `scale(${motion.scale})`
                    }}
                  >
                    <CircleDollar />
                  </button>
                  <button
                    className={css.deleteButton}
                    type="button"
                    title={this.props.labels.deleteButton}
                    onClick={this.delete}
                    style={{
                      opacity: motion.opacity,
                      transform: `scale(${motion.scale})`
                    }}
                  >
                    <CircleX />
                  </button>
                </div>
              </td>
            </tr>
            <tr className={css.lastRow}>
              <td colSpan={3}>
                <StaticContainer shouldUpdate={!this.state.isAnimating}>
                  <div className={css.lastRowContent}>
                    <div className={css.longName}>{this.props.longName}</div>
                    <div className={css.moreStuff}>
                      <span>
                        {`${stockCurrencySymbol} ${utils.formatNumber(
                          purchaseRate
                        )} → ${stockCurrencySymbol} ${utils.formatNumber(
                          price
                        )}`}
                      </span>
                      <span>
                        {`${this.props.labels.qtyLabel}: ${utils.formatNumber(
                          qty
                        )}`}
                      </span>
                    </div>
                  </div>
                </StaticContainer>

                <div
                  className={css.hoverTarget}
                  onMouseEnter={this.onMouseEnter}
                  onMouseLeave={this.onMouseLeave}
                  style={{ transform: `translateX(${motion.x}px)` }}
                />
              </td>
            </tr>
          </tbody>
        )}
      </Motion>
    );
  }
}

export default Stock;
