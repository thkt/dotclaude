type Props = { comment: string };

export function CommentView({ comment }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
}
