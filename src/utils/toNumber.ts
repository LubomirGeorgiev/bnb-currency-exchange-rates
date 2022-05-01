const checkIfValid = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`value has to be typeof: 'string' but got typeof: '${typeof value}'`);
  }
}

export const convertStringToNumber = (value) => {
  checkIfValid(value)

  if (Number.isNaN(Number(value))) {
    // if not a number
    return NaN
  }

  const float = parseFloat(value)

  // check if integer
  if (float % 1 === 0) {
    const int = parseInt(value, 10);

    return int
  }

  return parseFloat(float.toFixed(3))
}

export default convertStringToNumber
