import { Button, type ButtonProps } from "./Button";

export const ButtonWrapper = (props: ButtonProps) => {
  return <Button {...props} />;
};

export const PrimaryButtonWrapper = (props: ButtonProps) => {
  return <Button {...props} variant="primary" />;
};
