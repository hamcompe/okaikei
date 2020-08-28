import { differenceInCalendarMonths } from 'date-fns'

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

type SubscriptionChangeLog = {
  id: number
  'start date': string
  service: string[]
  members: string[]
}

function calculatePaymentWithPricePerHead({
  serviceData,
  subscriptionChangeLogData,
}: {
  serviceData: any
  subscriptionChangeLogData: SubscriptionChangeLog[]
}) {
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
    }
  })
}

export function calculatePaymentSummary({
  transactionsData,
  serviceData,
  subscriptionChangeLogData,
  memberData,
}: {
  transactionsData: any
  serviceData: any
  subscriptionChangeLogData: SubscriptionChangeLog[]
  memberData: any
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
    .map((item) => ({ ...item, memberName: findMemberName(item.ownerId) }))
}
