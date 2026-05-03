import DOMPurify from "dompurify";

type Props = { comment: string };

export function CommentView({ comment }: Props) {
  const sanitized = DOMPurify.sanitize(comment);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
