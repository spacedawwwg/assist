import {Button, Dialog, Flex, Stack, Text, TextArea, Tooltip} from '@sanity/ui'
import {getInstructionTitle} from '../helpers/misc'
import {PlayIcon} from '@sanity/icons'
import {
  createContext,
  Dispatch,
  FormEvent,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {UserInputBlock, userInputTypeName} from '../types'
import {RunInstructionArgs} from './AssistLayout'
import {useApiClient, useRunInstructionApi} from '../useApiClient'
import {useAiAssistanceConfig} from './AiAssistanceConfigContext'
import {FormFieldHeaderText} from 'sanity'

type BlockInputs = Record<string, string>
const NO_INPUT: BlockInputs = {}

export interface RunInstructionContextValue {
  runInstruction: (req: RunInstructionArgs) => void
  instructionLoading: boolean
}

export const RunInstructionContext = createContext<RunInstructionContextValue>({
  runInstruction: () => {},
  instructionLoading: false,
})

export function useRunInstruction() {
  return useContext(RunInstructionContext)
}

function isUserInputBlock(block: {_type: string}): block is UserInputBlock {
  return block._type === userInputTypeName
}

export function RunInstructionProvider(props: PropsWithChildren<{}>) {
  const {config} = useAiAssistanceConfig()
  const apiClient = useApiClient(config?.__customApiClient)
  const {runInstruction: runInstructionRequest, loading} = useRunInstructionApi(apiClient)

  const id = useId()

  const [inputs, setInputs] = useState(NO_INPUT)
  const [runRequest, setRunRequest] = useState<
    (RunInstructionArgs & {userInputBlocks: UserInputBlock[]}) | undefined
  >()

  const runInstruction = useCallback(
    (req: RunInstructionArgs) => {
      if (loading) {
        return
      }
      const {instruction, ...request} = req
      const instructionKey = instruction._key
      const userInputBlocks = instruction?.prompt
        ?.flatMap((block) =>
          block._type === 'block' ? block.children.filter(isUserInputBlock) : [block]
        )
        .filter(isUserInputBlock)

      if (!userInputBlocks?.length) {
        runInstructionRequest({
          ...request,
          instructionKey,
          userTexts: undefined,
        })
        return
      }

      setRunRequest({
        ...req,
        userInputBlocks,
      })
    },
    [setRunRequest, runInstructionRequest, loading]
  )

  const close = useCallback(() => {
    setRunRequest(undefined)
    setInputs(NO_INPUT)
  }, [setRunRequest, setInputs])

  const runWithInput = useCallback(() => {
    if (runRequest) {
      const {instruction, userTexts, ...request} = runRequest
      runInstructionRequest({
        ...request,
        instructionKey: instruction._key,
        userTexts: Object.entries(inputs).map(([key, value]) => ({
          blockKey: key,
          userInput: value,
        })),
      })
    }
    close()
  }, [close, runInstructionRequest, runRequest, inputs])

  const open = !!runRequest

  const runDisabled = useMemo(
    () =>
      (runRequest?.userInputBlocks?.length ?? 0) >
      Object.entries(inputs).filter(([, value]) => !!value).length,
    [runRequest?.userInputBlocks, inputs]
  )

  const runButton = (
    <Button
      text="Run instruction"
      onClick={runWithInput}
      tone="primary"
      icon={PlayIcon}
      style={{width: '100%'}}
      disabled={runDisabled}
    />
  )

  const contextValue: RunInstructionContextValue = useMemo(
    () => ({runInstruction, instructionLoading: loading}),
    [runInstruction, loading]
  )

  return (
    <RunInstructionContext.Provider value={contextValue}>
      {open ? (
        <Dialog
          id={id}
          open={open}
          onClose={close}
          width={1}
          header={getInstructionTitle(runRequest?.instruction)}
          footer={
            <Flex justify="space-between" padding={2} flex={1}>
              {runDisabled ? (
                <Tooltip
                  content={
                    <Flex padding={2}>
                      <Text>Unable to run instruction. All fields must have a value.</Text>
                    </Flex>
                  }
                  placement="top"
                >
                  <Flex flex={1}>{runButton}</Flex>
                </Tooltip>
              ) : (
                runButton
              )}
            </Flex>
          }
        >
          <Stack padding={4} space={2}>
            {runRequest?.userInputBlocks?.map((block, i) => (
              <UserInput
                key={block._key}
                block={block}
                autoFocus={i === 0}
                inputs={inputs}
                setInputs={setInputs}
              />
            ))}
          </Stack>
        </Dialog>
      ) : null}
      {props.children}
    </RunInstructionContext.Provider>
  )
}

function UserInput(props: {
  block: UserInputBlock
  inputs: BlockInputs
  setInputs: Dispatch<SetStateAction<BlockInputs>>
  autoFocus?: boolean
}) {
  const {block, autoFocus, setInputs, inputs} = props
  const key = block._key
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const onChange = useCallback(
    (e: FormEvent<HTMLTextAreaElement>) => {
      setInputs((current) => ({
        ...current,
        [key]: (e.currentTarget ?? e.target).value,
      }))
    },
    [key, setInputs]
  )

  const value = useMemo(() => inputs[key], [inputs, key])

  useEffect(() => {
    if (!autoFocus) {
      return
    }
    setTimeout(() => textAreaRef.current?.focus(), 0)
  }, [autoFocus])

  return (
    <Stack padding={2} space={3}>
      <FormFieldHeaderText
        title={block?.message ?? 'Provide more context'}
        description={block.description}
      />
      <TextArea
        ref={textAreaRef}
        rows={4}
        value={value}
        onChange={onChange}
        style={{resize: 'vertical'}}
      />
    </Stack>
  )
}
