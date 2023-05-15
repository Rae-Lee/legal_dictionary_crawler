export const getDate = () => {
  const today = new Date()
  const year = today.getFullYear() - 1911
  const month = (today.getMonth() + 1) >= 10 ? (today.getMonth() + 1) : ('0' + (today.getMonth() + 1))
  const date = today.getDate() < 10 ? ('0' + today.getDate()) : today.getDate()
  const updateDate = `${year}-${month}-${date}`
  return updateDate
}
