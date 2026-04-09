import BalanzAPI from "../services/balanz_api";
import ConfirmDeleteAction from "./ConfirmDeleteAction";

export interface DeleteChargerProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  snack: (message: string) => void;
}

const DeleteCharger: React.FC<DeleteChargerProp> = ({
  api,
  charger_id,
  charger_alias,
  snack,
}) => {
  const deleteCharger = async () => {
    const [ok] = await api.call("DeleteCharger", { charger_id: charger_id });
    if (ok == 3) {
      snack("Charger succesfully deleted - pls manually refresh table");
    } else {
      snack("Failed to delete charger");
    }
  };

  return (
    <ConfirmDeleteAction
      title="Confirm Delete Charger"
      description={`Are you really really sure that you want to delete the charger ${charger_alias} (${charger_id})?`}
      onConfirm={deleteCharger}
    />
  );
};

export default DeleteCharger;
