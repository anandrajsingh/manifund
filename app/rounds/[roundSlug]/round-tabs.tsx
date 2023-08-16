'use client'
import { RichContent } from '@/components/editor'
import { EmptyContent } from '@/components/empty-content'
import { ProjectsDisplay } from '@/components/projects-display'
import { RegranterCard } from '@/components/regranter-card'
import { Tabs } from '@/components/tabs'
import { Profile } from '@/db/profile'
import { FullProject } from '@/db/project'
import { Round } from '@/db/round'
import { Topic } from '@/db/topic'
import { getSponsoredAmount } from '@/utils/constants'
import { UserPlusIcon, WrenchIcon } from '@heroicons/react/20/solid'
import { sortBy } from 'lodash'
import { useSearchParams } from 'next/navigation'
import { EditRound } from './edit-round'

export function RoundTabs(props: {
  round: Round
  projects: FullProject[]
  allTopics: Topic[]
  regranters?: Profile[]
}) {
  const { round, projects, allTopics, regranters } = props
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const currentTabName = searchParams.get('tab')
  const visibleProjects = projects.filter(
    (project) => project.stage !== 'hidden'
  )
  const tabs = [
    {
      name: 'Projects',
      href: `?tab=projects`,
      count: visibleProjects.length,
      current: currentTabName === 'projects' || currentTabName === null,
      display: (
        <>
          {visibleProjects.length === 0 ? (
            <EmptyContent
              link={'/create'}
              icon={<WrenchIcon className="h-10 w-10 text-gray-400" />}
              title={'No projects yet.'}
              subtitle={'Create one!'}
            />
          ) : (
            <ProjectsDisplay
              projects={projects}
              allTopics={allTopics}
              sortOptions={[
                'votes',
                'newest first',
                'oldest first',
                round.title === 'Regrants' ? 'funding goal' : 'valuation',
                'percent funded',
                'distance from minimum funding',
                'number of comments',
              ]}
            />
          )}
        </>
      ),
    },
  ]
  if (round.title === 'Regrants' && regranters) {
    const sortedRegranters = sortBy(regranters, [
      function (regranter: Profile) {
        return -getSponsoredAmount(regranter.id)
      },
    ])
    tabs.push({
      name: 'Regrantors',
      href: `?tab=regrants`,
      count: sortedRegranters.length,
      current: currentTabName === 'regrants',
      display: (
        <>
          {sortedRegranters.length === 0 ? (
            <EmptyContent
              icon={<UserPlusIcon className="h-10 w-10 text-gray-400" />}
              title={'No regrantors yet.'}
              subtitle={'Pending kickoff in early June.'}
            />
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {sortedRegranters.map((regranter) => {
                return (
                  <RegranterCard key={regranter.id} regranter={regranter} />
                )
              })}
            </div>
          )}
        </>
      ),
    })
  }
  tabs.push({
    name: 'About',
    href: `?tab=about`,
    count: 0,
    current: currentTabName === 'about',
    display: (
      <div>
        {round.description && <RichContent content={round.description} />}
        <EditRound round={round} />
      </div>
    ),
  })
  return <Tabs tabs={tabs} />
}
