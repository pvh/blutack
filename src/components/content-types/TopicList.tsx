import React, { useCallback, useEffect, useRef, useState } from "react";
import * as ContentTypes from "../pushpin-code/ContentTypes";
import { ContentProps, EditableContentProps } from "../Content";
import { useDocument, useHandle, useRepo } from "automerge-repo-react-hooks";
import "./TextContent.css";
import { DocCollection, DocHandle, DocumentId } from "automerge-repo";
import ContentList, { ContentListInList } from "./ContentList";
import { BoardDoc, BoardDocCard } from "./board";
import { parseDocumentLink, PushpinUrl } from "../pushpin-code/ShareLink";
import { TextDoc } from "./TextContent";
import './TopicList.css'
import classNames from "classnames";
import { sortBy } from "lodash";
import * as UriList from "../pushpin-code/UriList";
import Author from "./workspace/Author";


/** UserId => did they upvote */
interface Votes {
  [id: DocumentId]: boolean
}

interface VotesByTitle {
  [title: string]: Votes
}

interface Topic {
  title: string
  votes: Votes
}

interface TopicListDoc {
  votesByTitle: VotesByTitle
  isSorted: boolean
}

interface Props extends ContentProps {
  boardId: DocumentId;
}

TopicList.minWidth = 6;
TopicList.minHeight = 2;
TopicList.defaultWidth = 15;


function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

export default function TopicList({ boardId, documentId, selfId }: Props) {
  const [topicList, changeTopicList] = useDocument<TopicListDoc>(documentId)
  const textDocs = useTextDocsInBoard(boardId)

  if (!topicList || !topicList.votesByTitle) {
    return null
  }

  const handleDragStart = (evt: React.DragEvent<HTMLDivElement>, text: string) => {
    console.log('dragStart')

    stopPropagation(evt)
    evt.dataTransfer.setData("text/plain", text)
  }

  const toggleVoteForTopic = ({ title }: Topic) => {
    changeTopicList((topicList) => {
      if (!topicList.votesByTitle[title]) {
        topicList.votesByTitle[title] = {}
      }

      if (topicList.votesByTitle[title][selfId]) {
        delete topicList.votesByTitle[title][selfId]
      } else {
        topicList.votesByTitle[title][selfId] = true
      }
    })
  }

  const toggleIsSorted = () => {
    changeTopicList((topicList) => {
      topicList.isSorted = !topicList.isSorted
    })
  }

  const topics: Topic[] = (
    textDocs
      .flatMap((textDoc) => {
        if (!textDoc || !textDoc.text) {
          return []
        }

        const text = textDoc.text.toString()

        if (!text.startsWith("# Topics")) {
          return []
        }

        return getTopLevelBulletPointsInText(text)
      })
      .map(title => {
        return {
          title,
          votes: topicList?.votesByTitle[title] ?? {}
        }
      })
  )

  return (
    <div onDoubleClick={stopPropagation} className="TopicList">
      <h1 className="TopicList-title">
        Upvoter

        <button
          className={classNames("TopicList-button", {
            'is-selected': topicList.isSorted
          })}
          onClick={() => toggleIsSorted()}>
          sorted
        </button>
      </h1>

      <ul className="TopicList-list">
        {(topicList.isSorted
          ? sortBy(topics, ({ votes }) => -Object.keys(votes).length)
          : topics).map((topic, index) => (
          <li
            key={index}
            className="TopicList-item"
          >
            <button
              className={classNames("TopicList-button", {
                'is-selected': topic.votes[selfId]
              })}
              onClick={() => toggleVoteForTopic(topic)}>
              ▲
            </button>
            <div className="TopicList-count">
              {Object.keys(topic.votes).length}
            </div>
            <div
              draggable
              onDragStart={(evt) => {
                handleDragStart(evt, topic.title)
              }}
            >
              {topic.title}
            </div>
            <div className="TopicList-spacer"></div>
            <div className="Authors">
              {Object.keys(topic.votes).map((id) => <Author key={id} contactId={id as DocumentId} isPresent={false} />)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getTopLevelBulletPointsInText(text: string): string[] {
  return Array.from(text.matchAll(/^-(.*)/mg))
    .map(([, topic]) => topic.trim())
}

function useTextDocsInBoard(boardId: DocumentId): TextDoc[] {
  const boardHandle = useHandle<BoardDoc>(boardId)
  const handlersRef = useRef<{ [id: DocumentId]: DocHandle<TextDoc> }>({})
  const repo = useRepo()
  const [textDocs, setTextDocs] = useState<{ [id: DocumentId]: TextDoc }>({})

  function setTextDoc(id: DocumentId, doc: TextDoc) {
    setTextDocs((textDocs) => ({
      ...textDocs,
      [id]: doc
    }))
  }

  function updateActiveCards(cards: BoardDocCard[]) {
    const handlers = handlersRef.current

    const prevHandlerIds = Object.keys(handlers)

    const textCardIds = (
      Object.values(cards)
        .map(card => parseDocumentLink(card.url))
        .filter(({ type }) => type === "text")
        .map(card => card.documentId)
    )

    textCardIds.forEach(id => {
      if (handlers[id]) {
        return
      }

      const handler = handlers[id] = repo.find<TextDoc>(id)
      handler.value().then((doc) => {
        setTextDoc(id as DocumentId, doc)
      })
      handler.on("change", (evt) => {
        setTextDoc(id as DocumentId, evt.doc)
      })
    })

    prevHandlerIds.forEach(id => {
      if (handlers[id as DocumentId]) {
        return
      }

      const handler = handlers[id as DocumentId]
      handler.off("change")
      delete handlers[id as DocumentId]

      setTextDocs((textDocs) => {
        const copy = { ...textDocs };
        delete copy[id as DocumentId];
        return copy
      })
    })

  }

  useEffect(() => {
    boardHandle.value().then(doc => {
      updateActiveCards(Object.values(doc.cards))
    })

    boardHandle.on('change', (evt) => {
      updateActiveCards(Object.values(evt.doc.cards))
    }, [boardHandle])
  })

  return Object.values(textDocs)
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.votesByTitle = {}
    doc.isSorted = false
  });
}

ContentTypes.register({
  type: "topiclist",
  name: "Upvoter",
  icon: "list",
  contexts: {
    board: TopicList,
  },
  create,
});