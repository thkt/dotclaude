function renderHTML(content: string) {
  return { __html: content };
}

type Props = { bio: string };

export function ProfileBio({ bio }: Props) {
  return <div dangerouslySetInnerHTML={renderHTML(bio)} />;
}
