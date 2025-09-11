import { Button, Textfield } from "@belousovjr/uikit";
import { UserIcon } from "lucide-react";

export default function InviteForm({
  defaultName,
  loading,
  connect,
  close,
}: {
  defaultName?: string;
  loading?: boolean;
  connect: (name: string) => unknown;
  close: () => unknown;
}) {
  return (
    <form
      action={(data) => {
        const { peerName } = Object.fromEntries(data) as object as {
          peerName: string;
        };

        connect(peerName);
      }}
      className="grid gap-5"
    >
      <p className="text-xl font-bold">Join the board via invite</p>
      <p className="text-base">The current data will be lost.</p>
      <Textfield
        size="lg"
        name="peerName"
        required
        minLength={4}
        label={<span className="text-white">Peer Name</span>}
        rightIcon={<UserIcon />}
        defaultValue={defaultName}
        autoFocus={!defaultName}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            close();
          }}
          type="button"
        >
          Cancel
        </Button>
        <Button loading={loading} autoFocus={!!defaultName}>
          Join
        </Button>
      </div>
    </form>
  );
}
