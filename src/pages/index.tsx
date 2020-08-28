import Airtable from 'airtable'
import { calculatePaymentSummary } from '../lib/data-process'

function HomePage({ data }): JSX.Element {
  return (
    <main>
      <div className="container mx-auto px-6 pb-10">
        <h1 className="text-3xl font-bold mt-8 mb-4">My Subscription</h1>
        <div>
          {data.map(({ memberName, subscribedService }) => (
            <div key={memberName}>
              <h2 className="text-2xl font-bold mb">{memberName}</h2>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {subscribedService.map(
                  ({ service, totalPaidAmount, needToPayAmount }) => (
                    <div
                      className="bg-white border px-4 py-2 rounded-lg"
                      key={service}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{service}</p>
                        </div>
                        <div className="ml-2">
                          <p className="font-bold text-2xl nums-tabular tracking-tight">
                            {totalPaidAmount - needToPayAmount}
                            <span className="font-normal text-base">฿</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                )}
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

  return {
    props: {
      data: calculatePaymentSummary({
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
