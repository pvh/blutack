/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useCallback, useState } from 'react'
import styled from 'styled-components'
import Select, { SelectItemRenderer, SelectRenderer } from 'react-dropdown-select'
import { TaskDoc } from '.'
import Content, { ContentProps } from '../../Content'
import { TaskTags } from './TaskTags'
import { useDocument } from 'automerge-repo-react-hooks'
import { PushpinUrl } from '../../pushpin-code/ShareLink'

const TaskBox = styled.div`
  background-color: #fff;
  border-radius: 5px;
  padding: 5px;
  margin: 10px 0;
  width: 100%;
`

const StatusDropdown = styled.select`
  vertical-align: top;
  border: none;
  margin: 5px;
  font-size: 14px;
  font-family: inherit;
  height: 30px;
  color: ${(props: any /* TODO */) => (props.value === 'done' ? '#aaa' : '')};
`

const TaskTitle = styled.input`
  border: none;
  height: 30px;
  margin: 5px;
  font-family: inherit;
  font-size: 16px;
  resize: none;
  font-weight: 500;
  width: 50%;
  ${(status: any) =>
    status === 'done' &&
    `
      text-decoration: line-through;
      color: #aaa;
    `}
`

const TaskDescription = styled.textarea`
  border: none;
  height: 60px;
  font-family: inherit;
  font-size: inherit;
  margin: 0 15px;
  resize: none;
  width: 350px;
  vertical-align: top;
  ${(status: any) =>
    status === 'done' &&
    `
      text-decoration: line-through;
      color: #aaa;
    `}
`

const MainRow = styled.div`
  margin-bottom: 5px;
`
const DetailsRow = styled.div``

const ArchiveButton = styled.button`
  font-size: 16px;
  border: none;
  border-radius: 10px;
  margin: 5px;
  vertical-align: top;
  &:hover {
    background: #ddd;
  }
`
const AssigneeDropdown = styled.div`
  display: inline-block;
  vertical-align: top;
  width: 200px;
  height: 40px;
`

const AssigneeDiv = styled.div`
  height: 30px;
  width: 100%;

  &:hover {
    background-color: #efefef;
  }
`

const Unassigned = styled.div`
  height: 30px;
  padding: 5px;
  color: #ccc;
`

export function Task(props: ContentProps) {
  const { documentId } = props
  const [doc, changeDoc] = useDocument<TaskDoc>(documentId)

  const toggleArchived = () => {
    changeDoc((doc: TaskDoc) => {
      doc.archived = !doc.archived
    })
  }
  const updateStatus = (value: string) => {
    changeDoc((doc: TaskDoc) => {
      doc.status = value
    })
  }
  const updateAssignee = (value: PushpinUrl | null) => {
    changeDoc((doc: TaskDoc) => {
      doc.assignee = value
    })
  }

  const updateTitle = (value: string) => {
    changeDoc((doc: TaskDoc) => {
      doc.title = value
    })
  }

  const updateDescription = useCallback(
    (value: string) => {
      changeDoc((doc: TaskDoc) => {
        doc.description = value
      })
    },
    [changeDoc]
  )

  if (!doc) {
    return null
  }

  interface AssigneeOption {
    label: string
    value: string | null
  }

  const unassignedOption = { label: 'unassigned', value: null }
  const assigneeOptions = [
    unassignedOption,
    ...doc.authors.map((member) => ({ value: member, label: member })),
  ]

  interface AssigneeProps {
    assignee: string | null
    onClick: (e: any) => void
  }
  const Assignee = ({ assignee, onClick }: AssigneeProps) => {
    return (
      <AssigneeDiv onClick={onClick}>
        {assignee ? (
          <Content
            context="list"
            url={`${assignee}?pushpinContentType=contact`}
            key={assignee as string}
          />
        ) : (
          <Unassigned>Unassigned</Unassigned>
        )}
      </AssigneeDiv>
    )
  }

  const customItemRenderer = ({ item, methods }: SelectItemRenderer<AssigneeOption>) => {
    return (
      <Assignee
        assignee={item.value}
        onClick={() => {
          methods.addItem(item)
        }}
      />
    )
  }

  const customContentRenderer = ({ state }: SelectRenderer<AssigneeOption>) => {
    return <Assignee assignee={state.values[0].value} onClick={() => {}} />
  }

  return (
    <TaskBox>
      <MainRow>
        <StatusDropdown value={doc.status} onChange={(e: any /* TODO */) => updateStatus(e.target.value)}>
          <option value="todo">📌 todo</option>
          <option value="inProgress">👷‍♂️ doing</option>
          <option value="done">done</option>
        </StatusDropdown>

        <TaskTitle
          value={doc.title}
          placeholder="Enter a task..."
          onChange={(e: any /* TODO */) => updateTitle(e.target.value)}
        />

        {/* <AssigneeDropdown>
          <Select
            values={[
              doc.assignee ? { label: doc.assignee, value: doc.assignee } : unassignedOption,
            ]}
            options={assigneeOptions}
            onChange={(values: any) => {
              updateAssignee(values[0].value)
            }}
            itemRenderer={customItemRenderer}
            contentRenderer={customContentRenderer}
            style={{ border: 'none' }}
          />
        </AssigneeDropdown> */}
      </MainRow>
      <DetailsRow>
        <TaskDescription
          value={doc.description}
          placeholder="Enter a description..."
          onChange={(e: any /* TODO */) => updateDescription(e.target.value)}
        />
      </DetailsRow>
    </TaskBox>
  )
}
