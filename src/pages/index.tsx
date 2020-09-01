import Airtable from 'airtable'
import { calculatePaymentSummary, getPaymentSummary } from '../lib/data-process'

function HomePage({ displayData }): JSX.Element {
  return (
    <main>
      <div className="container mx-auto px-6 pt-10 pb-10">
        <div>
          {displayData.map(({ serviceName, members }) => (
            <div key={serviceName}>
              <h2 className="text-3xl font-bold mb-2">{serviceName}</h2>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {members.map(({ name, paymentInfo }) => (
                  <div
                    className="bg-white border px-4 py-2 rounded-lg"
                    key={name}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold">{name}</p>
                        <p
                          className={`text-sm ${
                            paymentInfo.isOverdue
                              ? 'font-bold text-red-600'
                              : 'font-medium text-gray-600'
                          }`}
                        >
                          {paymentInfo.isOverdue
                            ? 'overdue'
                            : paymentInfo.availableUntil.date}
                        </p>
                      </div>
                      <div className="ml-2">
                        <p
                          className={`font-bold text-2xl nums-tabular tracking-tight ${
                            paymentInfo.isOverdue
                              ? 'text-red-600'
                              : 'text-blue-500'
                          }`}
                        >
                          {paymentInfo.credit.display}
                          <span className="text-base">฿</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

async function queryAirtable({ base, baseName, view }) {
  const records = await base(baseName)
    .select({
      view,
    })
    .all()

  const data = records.map(({ id, fields }) => ({
    id,
    ...fields,
  }))

  return data
}

export async function getStaticProps() {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE,
  )
  const transactionsData = await queryAirtable({
    base,
    baseName: 'transactions',
    view: 'transactions',
  })
  const serviceData = await queryAirtable({
    base,
    baseName: 'service',
    view: 'Grid view',
  })
  const subscriptionChangeLogData = await queryAirtable({
    base,
    baseName: 'subscription change log',
    view: 'Grid view',
  })
  const memberData = await queryAirtable({
    base,
    baseName: 'summary',
    view: 'Table View',
  })

  // console.log('transactionsData :>> ', transactionsData)
  // console.log('memberData :>> ', memberData)
  // const displayData = getPaymentSummary({
  //   transactionsData,
  //   serviceData,
  //   subscriptionChangeLogData,
  //   memberData,
  // })
  return {
    props: {
      data: calculatePaymentSummary({
        transactionsData,
        serviceData,
        subscriptionChangeLogData,
        memberData,
      }),

      displayData: getPaymentSummary({
        transactionsData,
        serviceData,
        subscriptionChangeLogData,
        memberData,
      }),
    },
    revalidate: 10, // In seconds
  }
}

export default HomePage
