import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: Props) => {
    return <input className="input" {...props} />;
};