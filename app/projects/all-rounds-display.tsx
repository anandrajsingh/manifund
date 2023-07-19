import { RoundData } from '@/components/round-data'
import { FullProject } from '@/db/project'
import { Round } from '@/db/round'
import Image from 'next/image'
import { orderBy, sortBy } from 'lodash'
import { Col } from '@/components/layout/col'
import { Profile } from '@/db/profile'
import { Row } from '@/components/layout/row'
import { RegranterCard } from '@/components/regranter-card'
import { MiniProjectCard, ProjectCard } from '@/components/project-card'

export function AllRoundsDisplay(props: {
  rounds: Round[]
  projects: FullProject[]
  regrantors: Profile[]
}) {
  const { rounds, projects, regrantors } = props
  const sortedRounds = sortRoundsForPreview(rounds)
  return (
    <div className="pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl lg:max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Active rounds
          </h2>
          <p className="mt-1 text-gray-600">
            Organized funding rounds with active projects.
          </p>
          <div className="mt-4 space-y-10 lg:mt-12 lg:space-y-14">
            {sortedRounds.map((round) => (
              <Round round={round} projects={projects} key={round.title} />
            ))}
            <RegrantsHighlight
              round={rounds[0]}
              projects={projects}
              regrantors={regrantors}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Round(props: { round: Round; projects: FullProject[] }) {
  const { round, projects } = props
  return (
    <article
      key={round.title}
      className="relative isolate flex h-full flex-col gap-3 lg:flex-row lg:gap-8"
    >
      <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:aspect-square lg:w-64 lg:shrink-0">
        <Image
          src={round.header_image_url ?? ''}
          height="500"
          width="800"
          alt=""
          className="absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover"
        />
      </div>
      <Col className="justify-between lg:py-3">
        <div className="group relative max-w-xl">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:underline lg:text-2xl">
            <a href={`/rounds/${round.slug}`}>
              <span className="absolute inset-0" />
              {round.title}
            </a>
          </h3>
          <p className="mt-5 text-sm leading-6 text-gray-600">
            {round.subtitle}
          </p>
        </div>
        <div className="mt-6 border-t border-gray-900/5 pt-6">
          {/* @ts-expect-error server component*/}
          <RoundData
            round={round}
            projects={projects.filter(
              (project) =>
                project.rounds.title === round.title &&
                project.stage !== 'hidden'
            )}
          />
        </div>
      </Col>
    </article>
  )
}

function RegrantsHighlight(props: {
  round: Round
  projects: FullProject[]
  regrantors: Profile[]
}) {
  const { round, projects, regrantors } = props
  const highlightedRegrantors = regrantors.slice(0, 3)
  const highlightedProjects = projects.slice(0, 3)
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {highlightedRegrantors.map((regrantor) => (
          <RegranterCard regranter={regrantor} />
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
        {highlightedProjects.map((project) => (
          <MiniProjectCard project={project} />
        ))}
      </div>
    </>
  )
}

function sortRoundsForPreview(rounds: Round[]) {
  const sortedByDueDate = orderBy(rounds, 'proposal_due_date', 'desc')
  const customSorted = sortBy(sortedByDueDate, [
    function (round: Round) {
      if (round.title === 'Regrants') {
        return 0
      } else {
        return 1
      }
    },
  ])
  return customSorted.filter((round) => round.title !== 'Independent')
}
