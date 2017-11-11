import React from "react";
import PropTypes from "prop-types";

import cn from "classnames";

import css from "./number.module.scss";
import utils from "../../js/utils";

const Number = ({ className, currencySymbol, number, numberOfDecimals }) => {
  const parsedNumber = parseFloat(number);

  return (
    <div
      className={cn(css.number, {
        [className]: className,
        [css.isPositive]: parsedNumber > 0,
        [css.isNegative]: parsedNumber < 0
      })}
    >
      {utils.formatNumber(parsedNumber, numberOfDecimals)}
      <span>{currencySymbol}</span>
    </div>
  );
};

Number.propTypes = {
  className: PropTypes.string,
  currencySymbol: PropTypes.string,
  number: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  numberOfDecimals: PropTypes.number
};

Number.defaultProps = {
  number: 0,
  numberOfDecimals: 2
};

export default Number;