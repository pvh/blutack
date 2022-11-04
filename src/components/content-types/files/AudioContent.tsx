import React, { useRef, useState } from "react"
import { FileDoc } from "."

import { ContentProps } from "../../Content"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import "./AudioContent.css"
import { createBinaryDataUrl } from "../../../blobstore/Blob"
import { usePresence } from "../../pushpin-code/PresenceHooks"

interface AudioState {
  paused: boolean
  time: number
}

export default function AudioContent({ documentId }: ContentProps) {
  const audioElement = useRef<HTMLAudioElement>(null)
  const progressElement = useRef<HTMLDivElement>(null)
  const progressBarElement = useRef<HTMLDivElement>(null)
  const [audioState, setAudioState] = useState<AudioState>({
    paused: true,
    time: 0,
  })

  const remotePresences = usePresence<AudioState>(
    documentId,
    // !audioState.paused || audioState.time > 0 ?
    { ...audioState }
    // : undefined
  )

  const presences = [] /* remotePresences.filter(
    (presence) => presence && presence.data && presence.data.time
  ) */
  const [doc] = useDocument<FileDoc>(documentId)
  if (!(doc && doc.binaryDataId)) {
    return null
  }

  function playAudio() {
    if (!audioElement.current) return
    setAudioState({ ...audioState, paused: false })
    audioElement.current.play()
  }
  function pauseAudio() {
    if (!audioElement.current) return
    setAudioState({ ...audioState, paused: true })
    audioElement.current.pause()
  }
  function scrubToTime(time: number) {
    if (!audioElement.current) return
    updateTime(time)
    audioElement.current.currentTime = time
  }
  function updateTime(time: number) {
    if (!audioElement.current || !progressBarElement.current) return
    progressBarElement.current.style.width = `${
      (time / audioElement.current.duration) * 100
    }%`
    setAudioState({ ...audioState, time })
  }
  function handlePlayPause() {
    if (audioState.paused) {
      playAudio()
    } else {
      pauseAudio()
    }
  }
  function handleEnd() {
    if (!audioElement.current) return
    setAudioState({ paused: true, time: 0 })
    audioElement.current.currentTime = 0
  }
  function handleAudioProgress() {
    if (audioElement.current) updateTime(audioElement.current.currentTime)
  }
  function handleScrubClick(e: React.MouseEvent) {
    if (!audioElement.current || !progressElement.current) return
    const position = e.nativeEvent.offsetX / progressElement.current.offsetWidth
    const time = position * audioElement.current.duration
    scrubToTime(time)
  }
  return (
    <div className="audioWrapper">
      <audio
        src={createBinaryDataUrl(doc.binaryDataId)}
        ref={audioElement}
        onTimeUpdate={handleAudioProgress}
        onEnded={handleEnd}
      />
      <div className="audioControls">
        <i
          onClick={handlePlayPause}
          className={`playPause fa fa-${audioState.paused ? "play" : "pause"}`}
        />
        <div
          className="progressContainer"
          ref={progressElement}
          onClick={handleScrubClick}
        >
          <div className="progressBar" ref={progressBarElement} />
        </div>
      </div>
    </div>
  )
}

const supportsMimeType = (mimeType: string) => !!mimeType.match("audio/")

ContentTypes.register({
  type: "audio",
  name: "Audio",
  icon: "file-audio-o",
  unlisted: true,
  contexts: {
    workspace: AudioContent,
    board: AudioContent,
  },
  supportsMimeType,
})
