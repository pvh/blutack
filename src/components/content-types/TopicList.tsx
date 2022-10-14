import React, { useEffect, useRef, useState } from "react";
import * as ContentTypes from "../pushpin-code/ContentTypes";
import { ContentProps, EditableContentProps } from "../Content";
import { useDocument, useHandle, useRepo } from "automerge-repo-react-hooks";
import "./TextContent.css";
import { DocCollection, DocHandle, DocumentId } from "automerge-repo";
import ContentList, { ContentListInList } from "./ContentList";
import { BoardDoc, BoardDocCard } from "./board";
import { parseDocumentLink, PushpinUrl } from "../pushpin-code/ShareLink";
import { TextDoc } from "./TextContent";

interface TopicListDoc {}

interface Props extends ContentProps {
  boardId: DocumentId;
}

TopicList.minWidth = 6;
TopicList.minHeight = 2;
TopicList.defaultWidth = 15;

export default function TopicList({boardId, documentId}: Props) {
  const textDocs = useTextDocsInBoard(boardId)
  const topics = textDocs.flatMap((textDoc) => (
    getTopicsInText(textDoc.text.toString())
  ))

  return (
    <div>
      <h1>Topic list</h1>

      <ul>
        {topics.map((topic, index) => (
          <li key={index}>{topic}</li>
        ))}
      </ul>
    </div>
  );
}

function getTopicsInText(text: string): string[] {
  return Array.from(text.matchAll(/^-(.*)/mg))
    .map(([, topic]) => topic.trim())
}

function useTextDocsInBoard (boardId: DocumentId): TextDoc[] {
  const boardHandle = useHandle<BoardDoc>(boardId)
  const handlersRef = useRef< {[id: DocumentId]: DocHandle<TextDoc>}>({})
  const repo = useRepo()
  const [textDocs, setTextDocs] = useState<{[id: DocumentId] : TextDoc }>([])

  function setTextDoc (id: DocumentId, doc: TextDoc) {
    setTextDocs((textDocs) => ({
      ...textDocs,
      [id]: doc
    }))
  }

  function updateActiveCards (cards: BoardDocCard[]) {
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
    // todo: init
  });
}

ContentTypes.register({
  type: "topiclist",
  name: "Topic List",
  icon: "list",
  contexts: {
    board: TopicList,
  },
  create,
});

console.log('foo', 123)