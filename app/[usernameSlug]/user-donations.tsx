import { FullTxn } from '@/db/txn'
import { HeartIcon, UserIcon, WrenchIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'
import { orderBy } from 'lodash'
import Link from 'next/link'

export function OutgoingDonationsHistory(props: { donations: FullTxn[] }) {
  const { donations } = props
  const sortedDonations = orderBy(donations, 'created_at', 'desc')
  const donationsDisplay = sortedDonations.map((donation) => (
    <Link
      key={donation.id}
      href={
        donation.project
          ? `/projects/${donation.projects?.slug}`
          : donation.profiles?.type === 'individual'
          ? `/${donation.profiles?.username}`
          : `/charity/${donation.profiles?.username}`
      }
      className="table-row w-full"
    >
      <td className="p-2">
        {donation.project && (
          <WrenchIcon className="h-5 w-5 flex-shrink-0 text-blue-500" />
        )}
        {!donation.project && donation.profiles?.type === 'individual' && (
          <UserIcon className="h-5 w-5 flex-shrink-0 text-orange-500" />
        )}
        {!donation.project && donation.profiles?.type === 'org' && (
          <HeartIcon className="h-5 w-5 flex-shrink-0 text-rose-500" />
        )}
      </td>
      <td className="p-2">
        {donation.project
          ? donation.projects?.title
          : donation.profiles?.full_name}
      </td>
      <td className="p-2 text-right">${donation.amount}</td>
      <td className="hidden p-2 text-right text-gray-500 sm:block">
        {formatDistanceToNow(new Date(donation.created_at), {
          addSuffix: true,
        })}
      </td>
    </Link>
  ))
  return (
    <div>
      <h1 className="text-xl sm:text-2xl">Outgoing donations</h1>
      <div className="overflow-hidden rounded-md bg-white shadow">
        <table role="list" className="w-full divide-y divide-gray-200">
          {donationsDisplay}
        </table>
      </div>
    </div>
  )
}
