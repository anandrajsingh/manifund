'use client'
import { Col } from '@/components/layout/col'
import { Row } from '@/components/layout/row'
import { Tooltip } from '@/components/tooltip'
import {
  PlusSmallIcon,
  MinusSmallIcon,
  CircleStackIcon,
} from '@heroicons/react/24/solid'
import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { NEXT_PUBLIC_STRIPE_KEY } from '@/db/env'
import { useSupabase } from '@/db/supabase-provider'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { Button } from '@/components/button'
import { Dialog } from '@headlessui/react'
import { DataPoint } from '@/components/data-point'
import { Card } from '@/components/card'
import { Input } from '@/components/input'

export function BalanceDisplay(props: {
  balance: number
  withdrawBalance: number
  spendableBalance: number
  accredited: boolean
  isOwnProfile?: boolean
}) {
  const {
    balance,
    withdrawBalance,
    spendableBalance,
    accredited,
    isOwnProfile,
  } = props
  const stats = [
    { name: 'Spendable', value: spendableBalance },
    { name: 'In pending offers', value: balance - spendableBalance },
  ]
  return (
    <Col className="h-fit">
      <Row className="h-fit justify-between gap-1 sm:gap-4 lg:gap-8">
        {isOwnProfile && (
          <Col className="justify-between">
            {accredited ? (
              <a
                href="https://airtable.com/shrIB5yGc56DoQBhJ"
                className="rounded bg-white shadow"
              >
                <Tooltip text="Add funds">
                  <PlusSmallIcon className="h-4 w-4 text-gray-500" />
                </Tooltip>
              </a>
            ) : (
              <StripeDepositButton />
            )}

            <a
              href="https://airtable.com/shrI3XFPivduhbnGa"
              className="rounded bg-white p-1 shadow"
            >
              <Tooltip text="Withdraw funds">
                <MinusSmallIcon className="h-4 w-4 text-gray-500" />
              </Tooltip>
            </a>
          </Col>
        )}
        <div className="w-full min-w-fit rounded border-none bg-orange-500 py-1 px-2">
          <DataPoint
            label="Balance"
            value={`$${balance.toString()}`}
            theme="white"
          />
        </div>
        {stats.map((stat) => (
          <Card
            key={stat.name}
            className="w-full min-w-fit border-none py-1 px-2"
          >
            <DataPoint label={stat.name} value={`$${stat.value.toString()}`} />
          </Card>
        ))}
      </Row>
      <p className="mt-2 w-full rounded bg-gray-100 p-1 text-center text-sm tracking-wider text-gray-400">
        {isOwnProfile ? 'You can ' : 'This user can '} withdraw up to $
        {withdrawBalance}.
      </p>
    </Col>
  )
}

const stripePromise = loadStripe(NEXT_PUBLIC_STRIPE_KEY ?? '')
function StripeDepositButton() {
  const { session } = useSupabase()
  const user = session?.user
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  let errorMessage = null
  if (amount < 10) {
    errorMessage = 'Minimum deposit is $10.'
  }
  return (
    <>
      <button
        type="button"
        className="rounded bg-white p-1 shadow"
        onClick={() => setOpen(true)}
      >
        <Tooltip text="Add funds">
          <PlusSmallIcon className="h-4 w-4 text-gray-500" />
        </Tooltip>
      </button>

      <Modal open={open}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <CircleStackIcon
            className="h-6 w-6 text-orange-600"
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <Dialog.Title
            as="h3"
            className="text-base font-semibold leading-6 text-gray-900"
          >
            Add money to your Manifund account
          </Dialog.Title>
          <div className="my-2">
            <p className="text-gray-500">
              As a non-accredited investor, you can donate your deposit and any
              profits to a charity of your choice, but you can only withdraw
              money donated or invested in your projects.
            </p>
          </div>
          <label htmlFor="amount">Amount (USD): </label>
          <Input
            type="number"
            step="0.01"
            id="amount"
            autoComplete="off"
            required
            value={amount ?? ''}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </div>
        <p className="mt-3 mb-2 text-center text-rose-500">{errorMessage}</p>
        <div className="sm:flex-2 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            color={'gray'}
            className="inline-flex w-full justify-center sm:col-start-1"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="sm:flex-2 inline-flex w-full justify-center"
            loading={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true)
              const response = await fetch('/api/checkout-sessions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  dollarQuantity: amount,
                  userId: user?.id,
                }),
              })
              const json = await response.json()
              setIsSubmitting(false)
              router.push(json.url)
            }}
          >
            Proceed to checkout
          </Button>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Your purchase constitutes a donation to Manifold for Charity, a
          registered 501(c)(3) nonprofit. Money in your Manifund account has
          zero monetary value and is not redeemable for cash, but can be donated
          to charity.
        </p>
      </Modal>
    </>
  )
}
