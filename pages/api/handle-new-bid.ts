import { NextApiRequest, NextApiResponse } from 'next'
import { getProjectAndProfileAndTxnsById, getProjectById } from '@/db/project'
import { maybeActivateGrant } from '@/utils/activate-grant'
import { Bid } from '@/db/bid'
import { createServerClient } from '@/db/supabase-server'
import { calculateFullTrades } from '@/utils/math'
import { calculateShareholders } from '@/app/projects/[slug]/project-tabs'
import { sendTemplateEmail, TEMPLATE_IDS } from '@/utils/email'
import { SupabaseClient } from '@supabase/supabase-js'
import { trade } from '@/utils/trade'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bid = req.body.record as Bid
  const supabase = createServerClient()
  const project = await getProjectById(supabase, bid.project)
  if (bid.type === 'donate') {
    await maybeActivateGrant(supabase, bid.project)
  } else if (project.stage === 'active') {
    await findAndMakeTrades(bid, supabase)
  }
  if (bid.type === 'buy') {
    await sendShareholderEmails(bid, supabase)
  }

  return res.status(200).json({ bid })
}

async function findAndMakeTrades(bid: Bid, supabase: SupabaseClient) {
  const newOfferType = bid.type
  const { data, error } = await supabase
    .from('bids')
    .select()
    .eq('project', bid.project)
    .order('valuation', { ascending: newOfferType === 'buy' })
  if (error) {
    throw error
  }
  const oldBids = data
    .filter((oldBid) => oldBid.bidder !== bid.bidder)
    .filter((oldBid) => oldBid.type !== newOfferType)
    .filter((oldBid) => oldBid.status === 'pending')
  let budget = bid.amount
  for (const oldBid of oldBids) {
    if (
      (newOfferType === 'buy'
        ? oldBid.valuation > bid.valuation
        : oldBid.valuation < bid.valuation) ||
      budget <= 0
    ) {
      return
    }
    const tradeAmount = Math.min(budget, oldBid.amount)
    budget -= tradeAmount
    await trade(oldBid, tradeAmount, bid.bidder)
  }
}

async function sendShareholderEmails(bid: Bid, supabase: SupabaseClient) {
  const project = await getProjectAndProfileAndTxnsById(supabase, bid.project)
  if (!project) {
    console.error('Project not found')
    return
  }
  const trades = calculateFullTrades(project.txns)
  const shareholders = calculateShareholders(trades, project.profiles)
  for (const shareholder of shareholders) {
    await sendTemplateEmail(
      TEMPLATE_IDS.GENERIC_NOTIF,
      {
        notifText: `${shareholder.profile.full_name} has made a ${
          bid.type
        } offer for ${Math.round(
          (bid.amount / bid.valuation) * 100
        )}% equity at a valuation of $${bid.valuation} for the project "${
          project.title
        }" on Manifund.`,
        buttonUrl: `manifund.org/projects/${project.slug}?tab=bids`,
        buttonText: 'See offer',
        subject: `New offer from ${shareholder.profile.full_name} on "${project.title}"`,
      },
      shareholder.profile.id
    )
  }
}
