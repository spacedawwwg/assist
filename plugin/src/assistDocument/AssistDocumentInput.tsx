import {InputProps, ObjectInputProps, ObjectSchemaType} from 'sanity'
import {AssistDocumentContextProvider} from './AssistDocumentContextProvider'
import {FirstAssistedPathProvider} from '../onboarding/FirstAssistedPathProvider'
import {useInstructionToaster} from './hooks/useInstructionToaster'
import {isType} from '../helpers/typeUtils'
import {useLayer} from '@sanity/ui'
import {useDocumentPane} from 'sanity/desk'
import {usePathKey} from '../helpers/misc'
import {ConnectFromRegion} from '../_lib/connector'
import {assistDocumentTypeName} from '../types'
import {useMemo} from 'react'
import {assistFormId} from '../_lib/form/constants'

export function AssistDocumentInputWrapper(props: InputProps) {
  if (!isType(props.schemaType, 'document') && props.id !== 'root' && props.id !== assistFormId) {
    return <AssistInput {...props} />
  }

  const documentId = (props.value as any)?._id as string | undefined
  if (!documentId) {
    return props.renderDefault(props)
  }

  return <AssistDocumentInput {...(props as ObjectInputProps)} documentId={documentId} />
}

function AssistDocumentInput({documentId, ...props}: ObjectInputProps & {documentId: string}) {
  useInstructionToaster(documentId, props.schemaType)

  const schemaType = useMemo(() => {
    if (props.schemaType.name !== assistDocumentTypeName) {
      return props.schemaType
    }
    return {
      ...props.schemaType,
      type: {
        ...props.schemaType.type,
        // compatability with i18nArrays plugin that requires this to be document
        name: 'document',
      },
    } as ObjectSchemaType
  }, [props.schemaType])

  return (
    <FirstAssistedPathProvider members={props.members}>
      <AssistDocumentContextProvider schemaType={schemaType} documentId={documentId}>
        {props.renderDefault({
          ...props,
          schemaType,
        })}
      </AssistDocumentContextProvider>
    </FirstAssistedPathProvider>
  )
}

function AssistInput(props: InputProps) {
  const {zIndex} = useLayer()
  const {paneKey} = useDocumentPane()
  const pathKey = usePathKey(props.path)

  return (
    <ConnectFromRegion _key={`${paneKey}_${pathKey}`} zIndex={zIndex} style={{minWidth: 0}}>
      {props.renderDefault(props)}
    </ConnectFromRegion>
  )
}
