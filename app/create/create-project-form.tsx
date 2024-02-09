'use client'

import { useSupabase } from '@/db/supabase-provider'
import { useEffect, useState } from 'react'
import { AmountInput, Input } from '@/components/input'
import { Button } from '@/components/button'
import { useRouter } from 'next/navigation'
import { TOTAL_SHARES } from '@/db/project'
import { ResetEditor, TextEditor } from '@/components/editor'
import { useTextEditor } from '@/hooks/use-text-editor'
import Link from 'next/link'
import { add, format, isAfter, isBefore } from 'date-fns'
import { Col } from '@/components/layout/col'
import { RequiredStar } from '@/components/tags'
import { clearLocalStorageItem } from '@/hooks/use-local-storage'
import { Row } from '@/components/layout/row'
import { Cause, MiniCause } from '@/db/cause'
import { SelectCauses } from '@/components/select-causes'
import { InvestmentStructurePanel } from './investment-structure'
import { Tooltip } from '@/components/tooltip'
import { SiteLink } from '@/components/site-link'
import { HorizontalRadioGroup } from '@/components/radio-group'
import { Checkbox } from '@/components/input'
import { usePartialUpdater } from '@/hooks/user-partial-updater'
import { JSONContent } from '@tiptap/core'

const DESCRIPTION_OUTLINE = `
<h3>Project summary</h3>
</br>
<h3>What are this project's goals and how will you achieve them?</h3>
</br>
<h3>How will this funding be used?</h3>
</br>
<h3>Who is on your team and what's your track record on similar projects?</h3>
</br>
<h3>What are the most likely causes and outcomes if this project fails? (premortem)</h3>
</br>
<h3>What other funding are you or your project getting?</h3>
</br>
`
const DESCRIPTION_KEY = 'ProjectDescription'

export type ProjectParams = {
  title: string
  subtitle: string | null
  minFunding?: number
  fundingGoal?: number
  verdictDate: string
  description?: JSONContent | string
  location: string
  selectedCauses: MiniCause[]
  selectedPrize: Cause | null
  founderPercent: number
  agreedToTerms: boolean
  lobbying: boolean
}

export function CreateProjectForm(props: { causesList: Cause[] }) {
  const { causesList } = props
  const [projectParams, updateProjectParams] = usePartialUpdater<ProjectParams>(
    {
      title: '',
      subtitle: '',
      verdictDate: format(add(new Date(), { months: 1 }), 'yyyy-MM-dd'),
      location: '',
      selectedCauses: [],
      selectedPrize: null,
      founderPercent: 50,
      agreedToTerms: false,
      lobbying: false,
    }
  )
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const editor = useTextEditor(DESCRIPTION_OUTLINE, DESCRIPTION_KEY)
  const [madeChanges, setMadeChanges] = useState<boolean>(false)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.on('update', () => {
        setMadeChanges(true)
      })
    }
  }, [editor])
  useEffect(() => {
    updateProjectParams({
      founderPercent:
        (1 -
          (projectParams.selectedPrize?.cert_params?.defaultInvestorShares ??
            0) /
            TOTAL_SHARES) *
        100,
    })
    if (!madeChanges) {
      editor?.commands.setContent(
        projectParams.selectedPrize?.project_description_outline ??
          DESCRIPTION_OUTLINE
      )
      setMadeChanges(false)
    }
  }, [projectParams.selectedPrize])
  const selectablePrizeCauses = causesList.filter(
    (cause) => cause.open && cause.prize
  )
  const selectableCauses = causesList.filter(
    (cause) => cause.open && !cause.prize
  )
  const minMinFunding = projectParams.selectedPrize?.cert_params
    ? projectParams.selectedPrize.cert_params.minMinFunding
    : 500
  const certParams = projectParams.selectedPrize?.cert_params ?? null
  const chinatalkPrizeSelected =
    projectParams.selectedPrize?.slug === 'china-talk'
  const [agreeToChinatalkTerms, setAgreeToChinatalkTerms] =
    useState<boolean>(false)

  const errorMessage = getCreateProjectErrorMessage(
    projectParams,
    minMinFunding,
    chinatalkPrizeSelected,
    agreeToChinatalkTerms
  )

  const router = useRouter()
  const handleSubmit = async () => {
    setIsSubmitting(true)
    const finalDescription = editor?.getJSON() ?? '<p>No description</p>'
    const response = await fetch('/api/create-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...projectParams, description: finalDescription }),
    })
    const newProject = await response.json()
    router.push(`/projects/${newProject.slug}`)
    clearLocalStorageItem(DESCRIPTION_KEY)
    setIsSubmitting(false)
  }

  const { session } = useSupabase()
  const user = session?.user
  if (!user) {
    return (
      <div>
        <Link href="/login" className="text-orange-500 hover:text-orange-600">
          Log in
        </Link>{' '}
        to create a project!
      </div>
    )
  }
  return (
    <Col className="gap-4 p-5">
      <div className="flex flex-col md:flex-row md:justify-between">
        <h1 className="text-3xl font-bold">Add a project</h1>
      </div>
      <Col className="gap-1">
        <label>I am applying for...</label>
        <p className="text-sm text-gray-600">
          Select &quot;a regular grant&quot; by default. The other options are
          specific prizes that you can learn more about{' '}
          <SiteLink followsLinkClass href="/causes">
            here
          </SiteLink>
          .
        </p>
        <HorizontalRadioGroup
          value={projectParams.selectedPrize?.slug ?? 'grant'}
          onChange={(value) =>
            updateProjectParams({
              selectedPrize:
                value === 'grant'
                  ? null
                  : selectablePrizeCauses.find(
                      (cause) => cause.slug === value
                    ) ?? null,
            })
          }
          options={{
            grant: 'A regular grant',
            ...Object.fromEntries(
              selectablePrizeCauses.map((cause) => [cause.slug, cause.title])
            ),
          }}
        />
      </Col>
      <Col className="gap-1">
        <label htmlFor="title">
          Title
          <RequiredStar />
        </label>
        <Col>
          <Input
            type="text"
            id="title"
            autoComplete="off"
            maxLength={80}
            value={projectParams.title}
            onChange={(event) =>
              updateProjectParams({ title: event.target.value })
            }
          />
          <span className="text-right text-xs text-gray-600">
            Maximum 80 characters
          </span>
        </Col>
      </Col>
      <Col className="gap-1">
        <label htmlFor="subtitle">Subtitle</label>
        <Col>
          <Input
            type="text"
            id="subtitle"
            autoComplete="off"
            maxLength={160}
            value={projectParams.subtitle ?? ''}
            onChange={(event) =>
              updateProjectParams({ subtitle: event.target.value })
            }
          />
          <span className="text-right text-xs text-gray-600">
            Maximum 160 characters
          </span>
        </Col>
      </Col>
      <Col className="gap-1">
        <Row className="items-center justify-between">
          <label>
            Project description
            <RequiredStar />
          </label>
          <ResetEditor
            storageKey={DESCRIPTION_KEY}
            editor={editor}
            defaultContent={
              projectParams.selectedPrize?.project_description_outline ??
              DESCRIPTION_OUTLINE
            }
          />
        </Row>
        <p className="text-sm text-gray-500">
          Note that the editor offers formatting shortcuts{' '}
          <Link
            className="hover:underline"
            href="https://www.notion.so/help/keyboard-shortcuts#markdown-style"
          >
            like Notion
          </Link>{' '}
          for hyperlinks, bullet points, headers, and more.
        </p>
        <TextEditor editor={editor} />
      </Col>
      {(!projectParams.selectedPrize || certParams?.proposalPhase) && (
        <Col className="gap-1">
          <label htmlFor="minFunding" className="mr-3 mt-4">
            Minimum funding (USD)
            <RequiredStar />
          </label>
          <p className="text-sm text-gray-600">
            The minimum amount of funding you need to start this project. If
            this amount is not reached, no funds will be sent. Due to the cost
            of approving grants and processing payments, we require this to be
            at least ${minMinFunding}.
          </p>
          <Col>
            <AmountInput
              id="minFunding"
              amount={projectParams.minFunding}
              onChangeAmount={(newMin) =>
                updateProjectParams({ minFunding: newMin })
              }
              placeholder={minMinFunding.toString()}
              error={
                projectParams.minFunding !== undefined &&
                projectParams.minFunding < minMinFunding
              }
              errorMessage={`Minimum funding must be at least $${minMinFunding}.`}
            />
          </Col>
        </Col>
      )}
      {!!certParams ? (
        <InvestmentStructurePanel
          minFunding={projectParams.minFunding ?? 0}
          founderPercent={projectParams.founderPercent}
          setFounderPercent={(newPercent: number) =>
            updateProjectParams({ founderPercent: newPercent })
          }
          certParams={certParams}
          agreedToTerms={projectParams.agreedToTerms}
          setAgreedToTerms={(newAgreedToTerms: boolean) => {
            updateProjectParams({ agreedToTerms: newAgreedToTerms })
          }}
        />
      ) : (
        <Col className="gap-1">
          <label htmlFor="fundingGoal">
            Funding goal (USD)
            <RequiredStar />
          </label>
          <p className="text-sm text-gray-600">
            Until this amount is raised, the project will be marked for donors
            as not fully funded. If this amount is different from your minimum
            funding, please explain in your project description what you could
            accomplish with the minimum funding and what you could accomplish
            with the full funding.
          </p>
          <AmountInput
            id="fundingGoal"
            amount={projectParams.fundingGoal}
            onChangeAmount={(newGoal) =>
              updateProjectParams({ fundingGoal: Number(newGoal) })
            }
            placeholder={minMinFunding.toString()}
            error={
              !!(
                projectParams.fundingGoal &&
                projectParams.minFunding &&
                (projectParams.fundingGoal < projectParams.minFunding ||
                  projectParams.fundingGoal <= 0)
              )
            }
            errorMessage="Funding goal must be greater than 0 and greater than or equal to your minimum funding."
          />
        </Col>
      )}
      {(!projectParams.selectedPrize || certParams?.proposalPhase) && (
        <Col className="gap-1">
          <label>
            Decision deadline
            <RequiredStar />
          </label>
          <p className="text-sm text-gray-600">
            After this deadline, if you have not reached your minimum funding
            bar, your application will close and you will not recieve any money.
            This date cannot be more than 6 weeks after posting.
          </p>
          <Input
            type="date"
            value={projectParams.verdictDate ?? ''}
            onChange={(event) =>
              updateProjectParams({ verdictDate: event.target.value })
            }
          />
        </Col>
      )}
      <Col className="gap-1">
        <label>Cause areas</label>
        <SelectCauses
          causesList={selectableCauses}
          selectedCauses={projectParams.selectedCauses}
          setSelectedCauses={(newCauses: MiniCause[]) =>
            updateProjectParams({ selectedCauses: newCauses })
          }
        />
      </Col>

      <Col className="gap-1">
        <label>
          In what countries are you and anyone else working on this located?
        </label>
        <p className="text-sm text-gray-600">
          This is for Manifund operations and will not be published.
        </p>
        <Input
          type="text"
          value={projectParams.location}
          onChange={(event) =>
            updateProjectParams({ location: event.target.value })
          }
        />
      </Col>

      <Row className="items-start">
        <Checkbox
          checked={projectParams.lobbying}
          onChange={(event) =>
            updateProjectParams({ lobbying: event.target.checked })
          }
        />
        <span className="ml-3 mt-0.5 text-sm leading-tight">
          <span className="font-bold">
            This project will engage in{' '}
            <a
              href="https://www.irs.gov/charities-non-profits/lobbying"
              className="text-orange-600 hover:underline"
            >
              lobbying
            </a>
            .
          </span>
          <span>
            {' '}
            Check this box if you will use this money to fund lobbying
            activities within the US or internationally.
          </span>
          <RequiredStar />
        </span>
      </Row>

      {/* Custom for Chinatalk: confirm terms & conditions */}
      {chinatalkPrizeSelected && (
        <Row className="mt-5 items-start">
          <Checkbox
            checked={agreeToChinatalkTerms}
            onChange={(event) => setAgreeToChinatalkTerms(event.target.checked)}
          />
          <span className="ml-3 leading-tight">
            <span className="text-sm font-bold text-gray-900">
              I agree to the{' '}
              <SiteLink
                href="https://www.chinatalk.info/essay"
                className="text-orange-500 hover:text-orange-600"
              >
                terms and conditions
              </SiteLink>{' '}
              of the Chinatalk Essay Competition.
            </span>
            <RequiredStar />
          </span>
        </Row>
      )}

      <Tooltip text={errorMessage}>
        <Button
          type="submit"
          className="w-full"
          disabled={!!errorMessage}
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          Publish project
        </Button>
      </Tooltip>
    </Col>
  )
}

// TODO: remove ChinaTalk-specific stuff after round is complete
function getCreateProjectErrorMessage(
  projectParams: ProjectParams,
  minMinFunding: number,
  chinatalkPrizeSelected: boolean,
  agreeToChinatalkTerms: boolean
) {
  if (projectParams.title === '') {
    return 'Your project needs a title.'
  } else if (
    projectParams.minFunding === null &&
    (!projectParams.selectedPrize ||
      projectParams.selectedPrize.cert_params?.proposalPhase)
  ) {
    return 'Your project needs a minimum funding amount.'
  } else if (
    projectParams.minFunding !== undefined &&
    projectParams.minFunding < minMinFunding &&
    (!projectParams.selectedPrize ||
      projectParams.selectedPrize.cert_params?.proposalPhase)
  ) {
    return `Your minimum funding must be at least $${minMinFunding}.`
  } else if (
    projectParams.selectedPrize &&
    projectParams.selectedPrize.cert_params?.adjustableInvestmentStructure &&
    !projectParams.agreedToTerms
  ) {
    return 'Please confirm that you agree to the investment structure.'
  } else if (
    projectParams.fundingGoal &&
    !projectParams.selectedPrize &&
    ((projectParams.minFunding &&
      projectParams.minFunding > projectParams.fundingGoal) ||
      projectParams.fundingGoal <= 0)
  ) {
    return 'Your funding goal must be greater than 0 and greater than or equal to your minimum funding goal.'
  } else if (
    isAfter(
      new Date(projectParams.verdictDate),
      add(new Date(), { weeks: 6 })
    ) ||
    isBefore(new Date(projectParams.verdictDate), new Date())
  ) {
    return 'Your application close date must be in the future but no more than 6 weeks from now.'
  } else if (
    (!projectParams.selectedPrize ||
      projectParams.selectedPrize.cert_params?.proposalPhase) &&
    !projectParams.verdictDate
  ) {
    return 'You need to set a decision deadline.'
  } else if (chinatalkPrizeSelected && !agreeToChinatalkTerms) {
    return "You must agree to Chinatalk's terms and conditions."
  } else {
    return null
  }
}
