/* eslint-disable jsx-a11y/alt-text */
import React from "react"
import "./Button.css"
import classNames from "classnames"

interface ButtonProps {
  children: React.ReactNode
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

const Button = (props: ButtonProps) => {
  return (
    <button className="Button" type="button" onClick={props.onClick}>
      {props.children}
    </button>
  )
}

export default Button
