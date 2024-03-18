'use client'
import { FullProject } from '@/db/project'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { Listbox, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import {
  getActiveValuation,
  getAmountRaised,
  getProposalValuation,
} from '@/utils/math'
import clsx from 'clsx'
import { ProjectGroup } from '@/components/project-group'
import { compareDesc, compareAsc } from 'date-fns'
import { Row } from './layout/row'
import { MiniCause, Cause, SimpleCause } from '@/db/cause'
import { CauseTag } from './tags'
import { Col } from './layout/col'
import { SearchBar } from './input'
import { searchInAny } from '@/utils/parse'
import { LoadMoreUntilNotVisible } from './widgets/visibility-observer'
import { Select } from './select'
import { sortBy } from 'lodash'

type SortOption =
  | 'votes'
  | 'funding goal'
  | 'valuation'
  | 'price'
  | 'number of comments'
  | 'newest first'
  | 'oldest first'
  | 'hot'

const DEFAULT_SORT_OPTIONS = [
  'hot',
  'votes',
  'newest first',
  'oldest first',
  'funding goal',
  // 'price',
  'number of comments',
] as SortOption[]

export function ProjectsDisplay(props: {
  projects: FullProject[]
  causesList: SimpleCause[]
  defaultSort?: SortOption
  hideRound?: boolean
  noFilter?: boolean
}) {
  const { projects, defaultSort, causesList, noFilter } = props
  const prices = getPrices(projects)
  const [sortBy, setSortBy] = useState<SortOption>(defaultSort ?? 'votes')
  const [includedCauses, setIncludedCauses] = useState<Cause[]>([])
  const [search, setSearch] = useState<string>('')
  const filteredProjects = filterProjects(projects, includedCauses)
  const sortedProjects = sortProjects(
    noFilter ? projects : filteredProjects,
    prices,
    sortBy
  )
  const CLIENT_PAGE_SIZE = 20
  const [numToShow, setNumToShow] = useState<number>(CLIENT_PAGE_SIZE)
  const selectedProjects = sortedProjects
    .filter((project) => {
      return searchInAny(
        search,
        project.title,
        project.blurb ?? '',
        project.profiles.full_name,
        project.profiles.username,
        project.project_transfers?.[0]?.recipient_name ?? ''
      )
    })
    .slice(0, numToShow)

  const proposals = selectedProjects.filter(
    (project) => project.stage == 'proposal'
  )
  const activeProjects = selectedProjects.filter(
    (project) => project.stage == 'active'
  )
  const completeProjects = selectedProjects.filter(
    (project) => project.stage == 'complete'
  )
  const unfundedProjects = selectedProjects.filter(
    (project) => project.stage == 'not funded'
  )

  return (
    <Col className="gap-2">
      <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
        <SearchBar search={search} setSearch={setSearch} className="w-full" />
        <div className="lg:w-4/12">
          <Select
            options={DEFAULT_SORT_OPTIONS}
            selected={sortBy}
            onSelect={(event) => setSortBy(event as SortOption)}
            label="Sort by"
          />
        </div>
      </div>
      {!noFilter && (
        <div className="relative w-full">
          <Listbox value={includedCauses} onChange={setIncludedCauses} multiple>
            {({ open }) => (
              <CauseFilterSelect
                includedCauses={includedCauses}
                setIncludedCauses={setIncludedCauses}
                open={open}
                causes={causesList.filter((c) => !c.prize)}
              />
            )}
          </Listbox>
        </div>
      )}
      <div className="mt-2 flex flex-col gap-5 sm:mt-5 sm:gap-10">
        {proposals.length > 0 && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900 sm:text-2xl">
              Proposals
            </h1>
            <ProjectGroup projects={proposals} prices={prices} />
          </div>
        )}
        {activeProjects.length > 0 && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900 sm:text-2xl">
              Active Projects
            </h1>
            <ProjectGroup projects={activeProjects} prices={prices} />
          </div>
        )}
        {completeProjects.length > 0 && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900 sm:text-2xl">
              Complete Projects
            </h1>
            <ProjectGroup projects={completeProjects} prices={prices} />
          </div>
        )}
        {unfundedProjects.length > 0 && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900 sm:text-2xl">
              Unfunded Projects
            </h1>
            <ProjectGroup projects={unfundedProjects} prices={prices} />
          </div>
        )}
      </div>
      <LoadMoreUntilNotVisible
        loadMore={() => {
          setNumToShow(numToShow + CLIENT_PAGE_SIZE)
          return Promise.resolve(true)
        }}
      />
    </Col>
  )
}
const countVotes = (project: FullProject) =>
  project.project_votes.reduce((acc, vote) => acc + vote.magnitude, 0)

function sortProjects(
  projects: FullProject[],
  prices: { [k: string]: number },
  sortType: SortOption
) {
  projects.forEach((project) => {
    project.bids = project.bids.filter((bid) => bid.status == 'pending')
  })
  if (sortType === 'votes') {
    return sortBy(projects, countVotes).reverse()
  }
  if (sortType === 'oldest first') {
    return sortBy(projects, (project) => new Date(project.created_at))
  }
  if (sortType === 'newest first') {
    return sortBy(projects, (project) => -new Date(project.created_at))
  }
  if (sortType === 'number of comments') {
    return sortBy(projects, (project) => -project.comments.length)
  }
  if (
    sortType === 'price' ||
    sortType === 'funding goal' ||
    sortType === 'valuation'
  ) {
    // TODO: Prices and funding goal seems kinda broken atm
    return sortBy(projects, (project) => {
      if (isNaN(prices[project.id])) {
        return 0
      }
      return -prices[project.id]
    })
  }

  if (sortType === 'hot') {
    return sortBy(projects, hotScore)
  }
  return projects
}

function hotScore(project: FullProject) {
  // Factors:
  // Time in days since project was created
  let time = Date.now() - new Date(project.created_at).getTime()
  time = time / (1000 * 60 * 60 * 24)
  // Number of upvotes
  const votes = countVotes(project)
  // Number of comments
  const comments = project.comments.length
  // Amount raised; take the log to make it less important
  const raised = getAmountRaised(project, project.bids, project.txns)

  const points = votes * 2 + comments + Math.log(raised + 1) * 3
  // Hacker News newness algorithm: https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
  // Note that we use days instead of hours, and modify the constants a bit
  const score = (points + 2) / time ** 1.8

  return -score
}

function filterProjects(projects: FullProject[], includedCauses: Cause[]) {
  if (includedCauses.length === 0) return projects
  return projects.filter((project) => {
    return project.causes.some((cause) => {
      return includedCauses.some((includedCause) => {
        return cause.slug === includedCause.slug
      })
    })
  })
}

function CauseFilterSelect(props: {
  includedCauses: Cause[]
  setIncludedCauses: (causes: Cause[]) => void
  open: boolean
  causes: MiniCause[]
}) {
  const { includedCauses, setIncludedCauses, open, causes } = props
  return (
    <div>
      <div>
        <Listbox.Button className="relative w-full cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-xs text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-base sm:leading-6">
          <Row className="flex-wrap gap-1">
            <span className="text-gray-500">Include</span>
            {includedCauses.length === 0 ? (
              ' all causes'
            ) : (
              <>
                {includedCauses.map((cause) => {
                  return (
                    <CauseTag
                      causeTitle={cause.title}
                      causeSlug={cause.slug}
                      key={cause.slug}
                      noLink
                    />
                  )
                })}
              </>
            )}
          </Row>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
      </div>
      <Transition
        show={open}
        as={Fragment}
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="relative w-full cursor-pointer select-none py-2 pl-3 pr-9 text-sm text-gray-900 hover:bg-orange-500 hover:text-white">
            <button
              onClick={() => setIncludedCauses([])}
              className="w-full text-left"
            >
              All causes
            </button>
            {includedCauses.length === 0 ? (
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-white">
                <CheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          {causes.map((cause) => (
            <Listbox.Option
              key={cause.title}
              className={({ active }) =>
                clsx(
                  active ? 'bg-orange-500 text-white' : 'text-gray-900',
                  'relative cursor-pointer select-none py-2 pl-3 pr-9'
                )
              }
              value={cause}
            >
              {({ selected, active }) => (
                <>
                  <CauseTag
                    causeTitle={cause.title}
                    causeSlug={cause.slug}
                    noLink
                  />
                  {selected ? (
                    <span
                      className={clsx(
                        active ? 'text-white' : 'text-orange-500',
                        'absolute inset-y-0 right-0 flex items-center pr-4'
                      )}
                    >
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Transition>
    </div>
  )
}

// Price here means funding goal for grants and valuation for certs
function getPrices(projects: FullProject[]) {
  const prices = Object.fromEntries(projects.map((project) => [project.id, 0]))
  projects.forEach((project) => {
    prices[project.id] =
      project.type === 'grant'
        ? project.funding_goal
        : project.stage === 'proposal'
        ? getProposalValuation(project)
        : getActiveValuation(
            project.txns,
            project.id,
            getProposalValuation(project)
          )
  })
  return prices
}
