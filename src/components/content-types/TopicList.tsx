import React, { useEffect, useState } from "react";
import * as ContentTypes from "../pushpin-code/ContentTypes";
import { ContentProps, EditableContentProps } from "../Content";
import { useDocument, useRepo } from "automerge-repo-react-hooks";
import "./TextContent.css";
import { DocCollection, DocHandle, DocumentId } from "automerge-repo";
import ContentList, { ContentListInList } from "./ContentList";
import { BoardDoc } from "./board";
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
  const [doc, changeDoc] = useDocument<TopicListDoc>(documentId);


  const textDocs = useTextDocsInBoard(boardId)


  return (
    <div>
      <h1>Topic list</h1>

      <pre>{textDocs.length}</pre>
    </div>
  );
}

function useTextDocsInBoard (boardId: DocumentId): TextDoc[] {
  const [board] = useDocument<BoardDoc>(boardId)
  const repo = useRepo()

  const [textDocs, setTextDocs] = useState<TextDoc[]>([])

  useEffect(() => {
    if (!board || !board.cards) {
      return
    }

    Promise.all(Object.values(board.cards)
      .map(card => parseDocumentLink(card.url))
      .filter(({ type }) => type === "text")
      .map(({ documentId}) => {
        const handle = repo.find<TextDoc>(documentId)
        return handle.value()
      }))
      .then(setTextDocs)

  }, [board])

  return textDocs
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