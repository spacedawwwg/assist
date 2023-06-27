import {HTMLProps, useEffect, useState} from 'react'
import {useConnectorsStore} from './useConnectorsStore'
import {ConnectorRegionRects} from './types'
import {ConnectorRegion} from './ConnectorRegion'

export function ConnectFromRegion(
  props: {_key: string; zIndex: number} & HTMLProps<HTMLDivElement>
) {
  const {children, _key: key, zIndex, ...restProps} = props
  const store = useConnectorsStore()
  const [rects, setRects] = useState<ConnectorRegionRects | null>(null)

  useEffect(() => store.from.subscribe(key, {zIndex}), [key, store, zIndex])

  useEffect(() => {
    if (rects) store.from.next(key, rects)
  }, [key, rects, store])

  return (
    <ConnectorRegion {...restProps} onRectsChange={setRects}>
      {children}
    </ConnectorRegion>
  )
}
