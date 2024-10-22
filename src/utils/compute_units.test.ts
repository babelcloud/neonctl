import { describe, it, expect } from 'vitest';
import { getComputeUnits } from './compute_units';

describe('getComputeUnits', () => {
  it('should return fixed size for a single number input', () => {
    const result = getComputeUnits('2');
    expect(result).toEqual({
      autoscaling_limit_min_cu: 2,
      autoscaling_limit_max_cu: 2,
    });
  });

  it('should return min and max for a valid range input', () => {
    const result = getComputeUnits('0.5-1');
    expect(result).toEqual({
      autoscaling_limit_min_cu: 0.5,
      autoscaling_limit_max_cu: 1,
    });
  });

  it('should throw an error for invalid input without dash', () => {
    expect(() => getComputeUnits('invalid')).toThrow(
      'Autoscaling should be either fixed size (e.g. 2) or min and max sizes delimited with a dash (e.g. "0.5-1")',
    );
  });

  it('should throw an error for input with dash but missing values', () => {
    expect(() => getComputeUnits('-')).toThrow(
      'Autoscaling should be either fixed size (e.g. 2) or min and max sizes delimited with a dash (e.g. "0.5-1")',
    );
  });

  it('should throw an error when min is not a number', () => {
    expect(() => getComputeUnits('a-1')).toThrow(
      'Autoscaling min should be a number',
    );
  });

  it('should throw an error when max is not a number', () => {
    expect(() => getComputeUnits('0.5-b')).toThrow(
      'Autoscaling max should be a number',
    );
  });

  it('should handle integer and float inputs correctly', () => {
    const result1 = getComputeUnits('1-2');
    expect(result1).toEqual({
      autoscaling_limit_min_cu: 1,
      autoscaling_limit_max_cu: 2,
    });

    const result2 = getComputeUnits('0.25-1.75');
    expect(result2).toEqual({
      autoscaling_limit_min_cu: 0.25,
      autoscaling_limit_max_cu: 1.75,
    });
  });

  it('should return zero values for empty string input', () => {
    const result = getComputeUnits('');
    expect(result).toEqual({
      autoscaling_limit_min_cu: 0,
      autoscaling_limit_max_cu: 0,
    });
  });

  it('should return min and max values for input with multiple dashes', () => {
    const result = getComputeUnits('0.5-1-2');
    expect(result).toEqual({
      autoscaling_limit_min_cu: 0.5,
      autoscaling_limit_max_cu: 1,
    });
  });

  it('should handle zero as a valid fixed size input', () => {
    const result = getComputeUnits('0');
    expect(result).toEqual({
      autoscaling_limit_min_cu: 0,
      autoscaling_limit_max_cu: 0,
    });
  });

  it('should return fixed size for negative numbers as input', () => {
    const result = getComputeUnits('-1');
    expect(result).toEqual({
      autoscaling_limit_min_cu: -1,
      autoscaling_limit_max_cu: -1,
    });
  });
});