import React from "react";
import * as ContentTypes from "../pushpin-code/ContentTypes";
import { ContentProps, EditableContentProps } from "../Content";
import { useDocument } from "automerge-repo-react-hooks";
import "./TextContent.css";
import { DocHandle, DocumentId } from "automerge-repo";
import ContentList, { ContentListInList } from "./ContentList";
import { BoardDoc } from "./board";

interface TopicListDoc {}

interface Props extends ContentProps {
  boardId: DocumentId;
}

TopicList.minWidth = 6;
TopicList.minHeight = 2;
TopicList.defaultWidth = 15;

export default function TopicList({boardId, documentId}: Props) {
  const [doc, changeDoc] = useDocument<TopicListDoc>(documentId);
  const [board] = useDocument<BoardDoc>(boardId)

  const cards = board?.cards ? Object.keys(board.cards).length : 0

  return (
    <div>
      <h1>Topic list</h1>

      {cards}
    </div>
  );
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
