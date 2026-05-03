import DOMPurify from "dompurify";

function safeRender(content: string) {
  return { __html: DOMPurify.sanitize(content) };
}

type Props = { bio: string };

export function ProfileBio({ bio }: Props) {
  return <div dangerouslySetInnerHTML={safeRender(bio)} />;
}
