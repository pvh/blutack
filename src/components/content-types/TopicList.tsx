import React from "react";
import * as ContentTypes from "../pushpin-code/ContentTypes";
import { ContentProps, EditableContentProps } from "../Content";
import { useDocument } from "automerge-repo-react-hooks";
import "./TextContent.css";
import { DocHandle } from "automerge-repo";
import { PushpinUrl } from "../pushpin-code/ShareLink";
import ContentList, { ContentListInList } from "./ContentList";

interface TopicListDoc {}

interface Props extends ContentProps {
  contentUrls: PushpinUrl;
}

TopicList.minWidth = 6;
TopicList.minHeight = 2;
TopicList.defaultWidth = 15;

export default function TopicList(props: Props) {
  const [doc, changeDoc] = useDocument<TopicListDoc>(props.documentId);

  return (
    <div>
      <h1>Topic list</h1>
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
