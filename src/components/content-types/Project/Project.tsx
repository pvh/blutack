import React, { useCallback, useState } from "react"

import styled from "styled-components"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import Content, { ContentProps } from "../../Content"
import { useDocument } from "automerge-repo-react-hooks"
import "./Project.css"

// We specify versions in the import path, but give non-versioned names in code.
// To change versions in the future, we only need to change this one spot.
import { ProjectDoc } from "."
import { createDocumentLink } from "../../../ShareLink"

const ProjectTitle = styled.input`
  font-weight: bold;
  font-size: 16px;
`

const ProjectDescription = styled.input`
  font-size: 14px;
`

const ProjectObjective = styled.input`
  font-size: 14px;
`

const ProjectMetadata = styled.div`
  display: flex;
`

const ProjectTitleContainer = styled.div`
  flex-grow: 1;
`
const ProjectMembers = styled.div`
  display: flex;
`

const ShowDebugLink = styled.a`
  font-size: 10px;
  color: #aaa;
`

export default function Project({ documentId }: ContentProps) {
  const [doc, changeDoc] = useDocument<ProjectDoc>(documentId)
  const setName = useCallback(
    (name: string) => {
      changeDoc((projectDoc: ProjectDoc) => {
        projectDoc.name = name
      })
    },
    [changeDoc]
  )

  const setDescription = useCallback(
    (description: string) => {
      changeDoc((projectDoc: ProjectDoc) => {
        projectDoc.description = description
      })
    },
    [changeDoc]
  )

  const setObjective = useCallback(
    (objective: string) => {
      changeDoc((projectDoc: ProjectDoc) => {
        projectDoc.metadata.objective = objective
      })
    },
    [changeDoc]
  )

  const addTask = useCallback(() => {
    ContentTypes.create("task", {}, (url) => {
      changeDoc((doc) => {
        doc.tasks.push(url)
      })
    })
  }, [changeDoc])

  if (!doc) return <></>

  return (
    <div className="ProjectContainer">
      <ProjectMetadata>
        <ProjectTitleContainer>
          <div>
            <ProjectTitle
              value={doc.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a title..."
            />
          </div>
          <div>
            <ProjectDescription
              value={doc.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description..."
            />
          </div>
        </ProjectTitleContainer>
      </ProjectMetadata>

      {doc.tasks.map((taskUrl) => (
        <Content
          context="list"
          url={taskUrl}
          key={taskUrl as string}
          projectMembers={doc.members}
        />
      ))}
      <button type="button" className="AddTaskButton" onClick={addTask}>
        Add new task
      </button>
    </div>
  )
}
