"""
Linear regression for FHFA HPI price projections.
Projects 1, 2, 3 years forward with confidence intervals.
"""
import numpy as np
from typing import List, Tuple


def compute_moving_average(values: List[float], window: int = 4) -> List[float]:
    """Compute rolling average; returns None for first (window-1) points."""
    result = []
    for i in range(len(values)):
        if i < window - 1:
            result.append(None)
        else:
            result.append(float(np.mean(values[i - window + 1: i + 1])))
    return result


def linear_regression_project(
    indices: List[float],
    n_quarters_forward: int = 12,
    confidence: float = 0.95,
) -> Tuple[List[float], List[float], List[float]]:
    """
    Fit linear regression on historical index values.
    Returns (projected_values, lower_bounds, upper_bounds) for n_quarters_forward quarters.
    """
    n = len(indices)
    t = np.arange(n, dtype=float)
    y = np.array(indices, dtype=float)

    # Fit
    coeffs = np.polyfit(t, y, 1)
    slope, intercept = coeffs[0], coeffs[1]

    # Residual std dev
    y_pred = np.polyval(coeffs, t)
    residuals = y - y_pred
    std_err = np.std(residuals, ddof=2)

    # t-value for 95% CI (~1.96)
    t_crit = 1.96

    # Project forward
    future_t = np.arange(n, n + n_quarters_forward, dtype=float)
    projected = (slope * future_t + intercept).tolist()

    # Uncertainty grows with distance from training data
    pred_intervals = []
    for ft in future_t:
        leverage = np.sqrt(1 + 1 / n + (ft - t.mean()) ** 2 / np.sum((t - t.mean()) ** 2))
        pred_intervals.append(t_crit * std_err * leverage)

    lower = [p - pi for p, pi in zip(projected, pred_intervals)]
    upper = [p + pi for p, pi in zip(projected, pred_intervals)]

    return projected, lower, upper


def project_dollar_value(
    current_price: float,
    current_index: float,
    projected_indices: List[float],
) -> List[float]:
    """Convert projected HPI indices to dollar values."""
    if current_index == 0:
        return [current_price] * len(projected_indices)
    return [current_price * (pi / current_index) for pi in projected_indices]


def yoy_change(indices: List[float]) -> float:
    """Compute year-over-year % change (last 4 quarters = 1 year)."""
    if len(indices) < 5:
        return 0.0
    return round((indices[-1] - indices[-5]) / indices[-5] * 100, 2)
