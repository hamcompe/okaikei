import {
  differenceInCalendarMonths,
  addMonths,
  set,
  getDate,
  formatDistance,
  format,
} from 'date-fns'

enum ServiceName {
  Spotify = 'Spotify',
  YouTubePremium = 'YouTube Premium',
}

type PaymentAmountSubscribedService = {
  serviceName: ServiceName
  totalAmount: number
}

type PaymentGroupByMember = {
  memberId: string
  name: string
  paymentAmountSubscribedService: PaymentAmountSubscribedService[]
}

type MemberData = {
  id: string
  Name: string
  transaction_ids: string[]
  service_registered: string[]
  'subscription change log': string[]
}

type PaymentWithPricePerHead = {
  id: string
  service: string[]
  members: string[]
  'start date': string
  'end date'?: string
  serviceId: string
  serviceName: string
  pricePerHead: number
  totalPricePerHead: number
}

type ServiceData = {
  id: string
  Name: string
  price: number
  date: string
}

type SubscriptionChangeLog = {
  id: string
  'start date': string
  'end date'?: string
  service: string[]
  members: string[]
}

function calculatePaymentWithPricePerHead({
  serviceData,
  subscriptionChangeLogData,
}: {
  serviceData: any
  subscriptionChangeLogData: SubscriptionChangeLog[]
}): PaymentWithPricePerHead[] {
  const findServicePrice = ({ serviceId }) =>
    serviceData.find(({ id }) => id === serviceId)?.price
  const findServiceName = ({ serviceId }) =>
    serviceData.find(({ id }) => id === serviceId)?.Name

  const findPricePerHead = ({
    serviceId,
    memberAmount,
    ignoreAmount = 0,
  }: {
    serviceId: string
    memberAmount: number
    ignoreAmount?: number
  }) =>
    Math.round(findServicePrice({ serviceId }) / (memberAmount + ignoreAmount))

  const findTotalPricePerHead = ({ startDate, endDate, pricePerHead }) => {
    const activeStartDate = new Date(startDate)
    const activeEndDate = endDate ? new Date(endDate) : new Date()
    const monthsDiff = differenceInCalendarMonths(
      activeEndDate,
      activeStartDate,
    )
    return pricePerHead * monthsDiff
  }

  return subscriptionChangeLogData.map((subscriptionChangeLogItem) => {
    const pricePerHead = findPricePerHead({
      serviceId: subscriptionChangeLogItem.service[0],
      memberAmount: subscriptionChangeLogItem.members.length,
      ignoreAmount: 1,
    })

    const serviceId = subscriptionChangeLogItem.service[0]
    return {
      ...subscriptionChangeLogItem,
      serviceId,
      serviceName: findServiceName({ serviceId }),
      pricePerHead,
      totalPricePerHead: findTotalPricePerHead({
        startDate: subscriptionChangeLogItem['start date'],
        endDate: subscriptionChangeLogItem['end date'],
        pricePerHead,
      }),
    } as PaymentWithPricePerHead
  })
}

function _createMap({ input, key }: { input: Array<any>; key: string }) {
  return input.reduce(
    (obj, item) => ({
      ...obj,
      [item[key]]: item,
    }),
    {},
  )
}
const _findTotalPricePerHead = ({ startDate, endDate, pricePerHead }) => {
  const activeStartDate = new Date(startDate)
  const activeEndDate = endDate ? new Date(endDate) : new Date()
  const monthsDiff = differenceInCalendarMonths(activeEndDate, activeStartDate)
  return pricePerHead * monthsDiff
}
function _calculateAvailableUntilDate({
  paidPrice,
  pricePerHead,
  totalPricePerHead,
  payDay,
}) {
  const monthAddUnit = Math.floor(
    (paidPrice - totalPricePerHead) / pricePerHead,
  )
  const today = new Date()
  const startDate = set(today, { date: payDay })
  const exactDate = addMonths(startDate, monthAddUnit)
  return {
    displayDate: formatDistance(exactDate, today),
    date: format(exactDate, 'MMM dd'),
  }
}
function _calculateCredit({ paidPrice, totalPricePerHead }) {
  const credit = paidPrice - totalPricePerHead
  return {
    display: credit > 0 ? `+${credit}` : `${credit}`,
    number: credit,
  }
}
function _mappingPaymentSummary(input: {
  paid: {
    serviceName: string
    amount: number
  }[]
  bill: {
    serviceName: string
    pricePerHead: number
    totalPricePerHead: number
    subscriptionPayDay: number
  }[]
}) {
  const { bill, paid } = input
  return bill.map((billTransaction) => {
    const paidPrice =
      paid.find(
        (paidTransaction) =>
          paidTransaction.serviceName === billTransaction.serviceName,
      )?.amount || 0

    return {
      ...billTransaction,
      paid: paidPrice,
      availableUntil: _calculateAvailableUntilDate({
        paidPrice,
        totalPricePerHead: billTransaction.totalPricePerHead,
        pricePerHead: billTransaction.pricePerHead,
        payDay: billTransaction.subscriptionPayDay,
      }),
      credit: _calculateCredit({
        paidPrice,
        totalPricePerHead: billTransaction.totalPricePerHead,
      }),
      isOverdue: paidPrice - billTransaction.totalPricePerHead < 0,
    }
  })
}
const _pickAll = (keys) => (obj) => ({
  ...keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] || null }), {}),
})
export function getPaymentSummary({
  transactionsData,
  serviceData,
  subscriptionChangeLogData,
  memberData,
}: {
  transactionsData: any
  serviceData: ServiceData[]
  subscriptionChangeLogData: SubscriptionChangeLog[]
  memberData: MemberData[]
}) {
  const serviceMap = _createMap({ input: serviceData, key: 'id' })

  const subscriptionPriceMap = subscriptionChangeLogData
    .map((item) => ({ ...item, service: item.service[0] }))
    .map((item) => ({
      ...item,
      pricePerHead: Math.round(
        serviceMap[item.service]?.price / (item.members.length + 1),
      ),
    }))
    .map((item) => ({ ...item, serviceName: serviceMap[item.service]?.Name }))
    .map((item) => ({
      ...item,
      subscriptionPayDay: getDate(new Date(serviceMap[item.service]?.date)),
    }))
    .map((item) => ({
      ...item,
      totalPricePerHead: _findTotalPricePerHead({
        startDate: item['start date'],
        endDate: item['end date'],
        pricePerHead: item.pricePerHead,
      }),
    }))
    .reduce(
      (
        obj,
        {
          id,
          serviceName,
          pricePerHead,
          totalPricePerHead,
          subscriptionPayDay,
        },
      ) => ({
        ...obj,
        [id]: {
          serviceName,
          pricePerHead,
          totalPricePerHead,
          subscriptionPayDay,
        },
      }),
      {},
    ) as {
    [subscriptionChangeLogID: string]: {
      serviceName: string
      pricePerHead: number
      totalPricePerHead: number
      subscriptionPayDay: number
    }
  }

  const sanitizedTransactionsData = transactionsData.map((transaction) => ({
    ...transaction,
    owner: transaction.owner[0],
  }))
  const transactionsDataMap = _createMap({
    input: sanitizedTransactionsData,
    key: 'id',
  })

  const memberMapped = memberData
    .map((member) => ({
      ...member,
      name: member.Name,
    }))
    .map((member) => ({
      ...member,
      subscribedServices: member['subscription change log'].map(
        (subscriptionChangeLogId) => ({
          ...subscriptionPriceMap[subscriptionChangeLogId],
        }),
      ),
    }))
    .map((member) => ({
      ...member,
      bill: groupAndSumKeys({
        input: member.subscribedServices,
        groupKey: 'serviceName',
        sumKeys: ['pricePerHead', 'totalPricePerHead'],
      }),
    }))
    .map((member) => ({
      ...member,
      paid: (member.transaction_ids || [])
        .map((transactionId) => {
          const { service, amount } = transactionsDataMap[transactionId]
          return {
            serviceName: service,
            amount,
          }
        })
        .filter((item) => Boolean(item.amount))
        .filter((item) => Boolean(item.serviceName)),
    }))
    .map((member) => ({
      ...member,
      paid: groupAndSumKeys({
        input: member.paid,
        groupKey: 'serviceName',
        sumKeys: ['amount'],
      }),
    }))
    .map((member) => ({
      ...member,
      paymentSummary: _mappingPaymentSummary(member),
    }))
    .map(_pickAll(['name', 'paymentSummary']))

  const serviceNames = serviceData.map(({ Name }) => Name)
  return serviceNames.map((serviceName) => ({
    serviceName,
    members: memberMapped
      .map((member) => {
        const paymentInfo = member.paymentSummary.find(
          (item) => item.serviceName === serviceName,
        )
        return {
          name: member.name,
          paymentInfo,
        }
      })
      .filter((member) => Boolean(member.paymentInfo)),
  }))
}

export function calculatePaymentSummary({
  transactionsData,
  serviceData,
  subscriptionChangeLogData,
  memberData,
}: {
  transactionsData: any
  serviceData: ServiceData[]
  subscriptionChangeLogData: SubscriptionChangeLog[]
  memberData: MemberData[]
}) {
  const paymentWithPricePerHead = calculatePaymentWithPricePerHead({
    serviceData,
    subscriptionChangeLogData,
  })

  const toGroupByOwner = (acc, cur) => {
    const owner = cur.owner[0]
    const ownerDataList = acc[owner] || []
    return {
      ...acc,
      [owner]: ownerDataList.concat(cur),
    }
  }
  const toGroupByService = (acc, cur) => {
    const service = cur.service
    if (!service) return acc

    const dataList = acc[service] || []
    return {
      ...acc,
      [service]: dataList.concat(cur),
    }
  }
  const transactionsGroupByOwner = transactionsData.reduce(toGroupByOwner, {})

  const transactionsGroupByService = Object.entries(
    transactionsGroupByOwner,
  ).map(([ownerId, value]) => {
    return {
      ownerId,
      subscribedService: (value as []).reduce(toGroupByService, {}),
    }
  })

  const sumServicePaid = (transactions) =>
    transactions.reduce((acc, cur) => acc + cur.amount, 0)
  const mapServiceTotalPaid = (subscribedServiceList) =>
    Object.entries(subscribedServiceList).map(([key, value]) => {
      return {
        service: key,
        totalPaidAmount: sumServicePaid(value),
      }
    })

  const transactionsGroupByOwnerServiceWithTotalPaid = transactionsGroupByService.map(
    (item) => ({
      ...item,
      subscribedService: mapServiceTotalPaid(item.subscribedService),
    }),
  )

  const findInvolvePayment = ({ memberId, serviceName }) => {
    return paymentWithPricePerHead
      .filter(({ members }) => members.includes(memberId))
      .filter(
        ({ serviceName: itemServiceName }) => itemServiceName === serviceName,
      )
  }
  const getTotalNeedToPayAmount = ({ memberId, serviceName }) =>
    findInvolvePayment({ memberId, serviceName }).reduce(
      (acc, cur) => acc + cur.totalPricePerHead,
      0,
    )

  const addNeedToPayAmount = ({ memberId, subscribedService }) =>
    subscribedService.map((serviceInfo) => ({
      ...serviceInfo,
      needToPayAmount: getTotalNeedToPayAmount({
        memberId,
        serviceName: serviceInfo.service,
      }),
    }))

  const findMemberName = (memberId) =>
    memberData.find((member) => member.id === memberId)?.Name

  return transactionsGroupByOwnerServiceWithTotalPaid
    .map((transaction) => {
      return {
        ...transaction,
        subscribedService: addNeedToPayAmount({
          memberId: transaction.ownerId,
          subscribedService: transaction.subscribedService,
        }),
      }
    })
    .map((item) => ({
      ...item,
      memberName: findMemberName(item.ownerId),
    }))
}

function groupBy({ input, key }) {
  return input.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: (obj[item[key]] || []).concat(item),
    }
  }, {})
}

function sum({ input, key }) {
  return input.reduce((acc, cur) => acc + cur[key], 0)
}

function groupAndSumKeys({ input, groupKey, sumKeys }) {
  const inputGroupGroupByKey = groupBy({
    input,
    key: groupKey,
  })

  return Object.entries(inputGroupGroupByKey).map(
    ([key, value]: [string, any]) => {
      return {
        [groupKey]: key,
        ...value?.[0],
        ...sumKeys.reduce(
          (obj, key) => ({ ...obj, [key]: sum({ input: value, key }) }),
          {},
        ),
      }
    },
  )
}
